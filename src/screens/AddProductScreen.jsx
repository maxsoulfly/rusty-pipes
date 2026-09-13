import { useState } from "react"
import {
  Link,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom"
import { IconAlert, IconCheck, IconInfo } from "@/components/icons"
import { TopBar } from "@/components/Nav"
import { Btn, Card, Input, OwnedToggle } from "@/components/primitives"
import { resolveIngredientType } from "@/domain/ingredientResolution"
import { createProduct } from "@/services/products"

export default function AddProductScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { catalog, inventory } = useOutletContext()
  const { types, aliases } = catalog
  const [name, setName] = useState("")
  const [ingType, setIngType] = useState("")
  const [brand, setBrand] = useState("")
  const [homemade, setHomemade] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const matchedType = resolveIngredientType(ingType, { types, aliases })

  const handleAdd = async () => {
    if (!matchedType) return
    setBusy(true)
    setError(null)
    try {
      const product = await createProduct({
        name,
        ingredientTypeId: matchedType.id,
        brand: brand || null,
        isHomemade: homemade,
      })
      await inventory.ownProduct(product.id)
      await catalog.refetch() // pick up the new product row for MyBarScreen's productsByType map
      navigate("/bar")
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="pb-[calc(96px_+_env(safe-area-inset-bottom,0px))]">
      <TopBar title="Add Product" onBack={() => navigate(-1)} />
      <div className="p-5 flex flex-col gap-5">
        <Card
          className="py-3 px-4 flex gap-2.5"
          style={{
            border: "1px solid rgba(34,211,238,0.2)",
            background: "rgba(34,211,238,0.04)",
          }}
        >
          <IconInfo size={16} className="text-cyan shrink-0 mt-px" />
          <p className="text-[13px] text-tx2 leading-normal">
            You don't need this for most ingredients - just toggle the
            ingredient type itself as owned in{" "}
            <Link to="/bar" className="text-cyan">
              My Bar
            </Link>
            . Use this screen only if you want to track a specific brand (e.g.
            this bottle of Gin is Hendrick's) or a homemade version. New
            ingredient types still require admin approval.
          </p>
        </Card>

        <div className="flex flex-col gap-3.5">
          <Input
            label="Product Name"
            placeholder="e.g. Hendrick's Gin"
            value={name}
            onChange={setName}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em]">
              Ingredient Type
            </label>
            <div className="relative">
              <input
                list="ing-types"
                placeholder="Select ingredient type..."
                value={ingType}
                onChange={(e) => setIngType(e.target.value)}
                className="bg-surface border border-bdr rounded-sm py-2.5 px-3.5 text-tx text-sm font-body w-full"
              />
              <datalist id="ing-types">
                {types.map((t) => (
                  <option key={t.id} value={t.name} />
                ))}
                {aliases.map((a) => (
                  <option key={a.id} value={a.alias} />
                ))}
              </datalist>
            </div>
            {matchedType && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 py-1.5 px-2.5 bg-green/8 rounded-[6px] border border-green/20">
                  <IconCheck size={14} className="text-green" />
                  <span className="text-[13px] text-green">
                    Matches catalog ingredient:{" "}
                    <strong>{matchedType.name}</strong>
                  </span>
                </div>
                {/* This screen only ever creates a product satisfying
                    matchedType - it can never add a new toggle-able style.
                    Real confusion found in testing: a name like "Rye
                    Whiskey" reads as a specific-enough item to feel done
                    here, when what's actually wanted is a sibling type
                    next to Bourbon/Scotch. */}
                <p className="text-xs text-tx3 leading-normal">
                  This adds a specific product under{" "}
                  <strong>{matchedType.name}</strong>. If "{name || ingType}" is
                  really its own style (like Bourbon or Rye), not a specific
                  bottle,{" "}
                  <Link
                    to={`/request-ingredient?name=${encodeURIComponent(name || ingType)}&returnTo=${encodeURIComponent(location.pathname + location.search)}`}
                    className="text-cyan"
                  >
                    request it as a new ingredient type
                  </Link>{" "}
                  instead.
                </p>
              </div>
            )}
            {ingType && !matchedType && (
              <div className="flex items-center gap-2 py-1.5 px-2.5 bg-amber/8 rounded-[6px] border border-amber/20">
                <IconAlert size={14} className="text-amber" />
                <span className="text-[13px] text-amber">
                  Doesn't match an existing ingredient type - new types require
                  admin approval, so this can't be added yet.{" "}
                  <Link
                    to={`/request-ingredient?name=${encodeURIComponent(ingType)}&returnTo=${encodeURIComponent(location.pathname + location.search)}`}
                    className="text-cyan"
                  >
                    Request it
                  </Link>
                </span>
              </div>
            )}
          </div>

          <Input
            label="Brand / Maker (optional)"
            placeholder="e.g. Hendrick's"
            value={brand}
            onChange={setBrand}
          />

          <div className="flex items-center justify-between py-3 border-t border-b border-bdr">
            <div>
              <div className="text-sm font-body font-medium text-tx">
                Homemade
              </div>
              <div className="text-xs text-tx3">Mark as a homemade product</div>
            </div>
            <OwnedToggle owned={homemade} onChange={setHomemade} />
          </div>

          {matchedType && (
            <Card className="p-3.5" style={{ background: "var(--surface2)" }}>
              <div className="text-xs font-bold text-tx3 uppercase tracking-[0.06em] mb-2.5 font-display">
                Preview
              </div>
              <div className="text-[13px] text-tx2 leading-normal">
                <strong className="text-tx">{name || "Your Product"}</strong>{" "}
                will satisfy the{" "}
                <strong className="text-cyan">{matchedType.name}</strong>{" "}
                requirement in recipes.
              </div>
            </Card>
          )}

          {error && <p className="text-xs text-coral">{error}</p>}
        </div>

        <Btn
          variant="primary"
          full
          onClick={handleAdd}
          disabled={busy || !name || !matchedType}
        >
          Add to My Bar
        </Btn>
      </div>
    </div>
  )
}
