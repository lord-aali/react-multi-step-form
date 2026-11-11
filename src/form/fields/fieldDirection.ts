import type {Direction, FormItem} from "../schema"

/** Explicit field `dir` wins; otherwise the form direction is used. */
export function resolveFieldDir(item: FormItem, formDir: Direction): Direction {
    return item.dir ?? formDir
}
