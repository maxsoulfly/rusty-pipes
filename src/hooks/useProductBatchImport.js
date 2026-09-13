import { useState } from "react"
import {
  buildProductImportPrompt,
  validateProductImport,
} from "@/schemas/productImport"
import { createProducts } from "@/services/catalog"

// Admin Batch Import -> Products. Fully self-contained - one flat bulk
// insert since products have no per-row children (unlike recipes'
// components/tags), and nothing outside ImportProducts.jsx reads or writes
// any of this state.
export function useProductBatchImport({ catalog }) {
  const [productBatchPhase, setProductBatchPhase] = useState("paste")
  const [productImportJson, setProductImportJson] = useState("")
  const [productImportResult, setProductImportResult] = useState(null)
  const [productImporting, setProductImporting] = useState(false)
  const [productPromptCopied, setProductPromptCopied] = useState(false)
  const [productImportSuccessMessage, setProductImportSuccessMessage] =
    useState(null)

  const productImportPrompt = buildProductImportPrompt({
    types: catalog.types,
    aliases: catalog.aliases,
  })

  const onCopyPrompt = () => {
    navigator.clipboard.writeText(productImportPrompt).catch(() => {})
    setProductPromptCopied(true)
    setTimeout(() => setProductPromptCopied(false), 2000)
  }

  const onValidate = () => {
    let parsed
    try {
      parsed = JSON.parse(productImportJson)
      if (!Array.isArray(parsed)) throw new Error("Expected a JSON array")
    } catch (err) {
      setProductImportResult({ parseError: err.message })
      setProductBatchPhase("results")
      return
    }
    const validation = validateProductImport(parsed, {
      types: catalog.types,
      aliases: catalog.aliases,
      existingProducts: catalog.products,
    })
    setProductImportResult(validation)
    setProductBatchPhase("results")
  }

  const onCommit = async () => {
    if (!productImportResult?.results) return
    const rows = productImportResult.results
      .filter((r) => r.valid)
      .map((r) => r.resolved)
    if (rows.length === 0) return
    setProductImporting(true)
    try {
      await createProducts(rows)
      await catalog.refetch()
      setProductImportSuccessMessage(
        `Imported ${rows.length} product${rows.length === 1 ? "" : "s"}.`,
      )
      setProductBatchPhase("paste")
      setProductImportJson("")
      setProductImportResult(null)
    } catch (err) {
      setProductImportResult({
        ...productImportResult,
        commitError: err.message,
      })
    } finally {
      setProductImporting(false)
    }
  }

  return {
    productImportSuccessMessage,
    productBatchPhase,
    setProductBatchPhase,
    productImportPrompt,
    productPromptCopied,
    onCopyPrompt,
    productImportJson,
    setProductImportJson,
    onValidate,
    productImportResult,
    setProductImportResult,
    productImporting,
    onCommit,
  }
}
