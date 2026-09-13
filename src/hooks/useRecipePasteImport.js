import { useState } from "react"
import { buildRecipeImportPrompt } from "@/schemas/recipeImport"
import { parseRecipePaste } from "@/schemas/recipePaste"

// Member-facing "paste a recipe, app fills in the form" - reuses the exact
// same AI-formatting prompt and ingredient/alias resolution as admin batch
// import, but deliberately lenient (parseRecipePaste) rather than
// all-or-nothing, since the result always lands in the caller's own form
// for the member to review before saving, not a direct commit.
//
// `onFill(result)` is the caller's own callback that applies the parsed
// recipe fields to its form state - this hook only owns entry-mode/paste-
// text/error/prompt-copied state and the parse step itself, never the core
// recipe form fields (EditorScreen.jsx keeps those, per its own "keep core
// recipe form state" boundary).
export function useRecipePasteImport({
  types,
  glasses,
  families,
  tasteTags,
  aliases,
  glassAliases,
  onFill,
}) {
  const [entryMode, setEntryMode] = useState("scratch")
  const [pasteJson, setPasteJson] = useState("")
  const [pasteError, setPasteError] = useState(null)
  const [promptCopied, setPromptCopied] = useState(false)

  const pastePrompt = buildRecipeImportPrompt({
    types,
    glasses,
    families,
    tasteTags,
    aliases,
  })

  const copyPastePrompt = () => {
    navigator.clipboard.writeText(pastePrompt).catch(() => {})
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const handleFillFromPaste = () => {
    setPasteError(null)
    let parsed
    try {
      parsed = JSON.parse(pasteJson)
    } catch (err) {
      setPasteError(`Couldn't parse that as JSON: ${err.message}`)
      return
    }
    const result = parseRecipePaste(parsed, {
      types,
      glasses,
      families,
      tasteTags,
      aliases,
      glassAliases,
    })
    if (!result) {
      setPasteError(
        "That doesn't look like a recipe - expected an object with a name, glass, steps, and components.",
      )
      return
    }
    onFill(result)
    setEntryMode("scratch")
  }

  return {
    entryMode,
    setEntryMode,
    pasteJson,
    setPasteJson,
    pasteError,
    promptCopied,
    pastePrompt,
    copyPastePrompt,
    handleFillFromPaste,
  }
}
