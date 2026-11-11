import type {Direction, FormItem} from "../schema"

export function resolveFieldDir(item: FormItem, formDir: Direction): Direction {
    return item.dir ?? formDir
}
