import type {FormItem} from "../schema"
import {useFormContext} from "../context"
import {isItemVisible} from "../logic"
import {useFormVersion} from "../store"
import FieldFrame from "./FieldFrame"
import TextFieldItem from "./TextFieldItem"
import RadioFieldItem from "./RadioFieldItem"
import CheckboxFieldItem from "./CheckboxFieldItem"
import StageFieldItem from "./StageFieldItem"
import SelectFieldItem from "./SelectFieldItem"
import DateFieldItem from "./DateFieldItem"
import FileFieldItem from "./FileFieldItem"
import AgreementFieldItem from "./AgreementFieldItem"
import TypographyItem from "./TypographyItem"

function ItemSwitch({item}: { item: FormItem }) {
    switch (item.type) {
        case "text":
            return <TextFieldItem item={item}/>
        case "radio":
            return <RadioFieldItem item={item}/>
        case "checkbox":
            return <CheckboxFieldItem item={item}/>
        case "stage":
            return <StageFieldItem item={item}/>
        case "select":
            return <SelectFieldItem item={item}/>
        case "date":
            return <DateFieldItem item={item}/>
        case "file":
            return <FileFieldItem item={item}/>
        case "agreement":
            return <AgreementFieldItem item={item}/>
        case "typography":
            return <TypographyItem item={item}/>
        default:
            return null
    }
}

export default function ItemList({items}: { items: FormItem[] }) {
    const {store, dir} = useFormContext()
    useFormVersion(store)
    return (
        <>
            {items.map((item, index) => {
                if (item.type === "hidden") return null
                if (!isItemVisible(item, store.values)) return null
                const key = item.name ? `${item.type}-${item.name}` : `${item.type}-${index}`
                return (
                    <FieldFrame key={key} item={item} formDir={dir}>
                        <ItemSwitch item={item}/>
                    </FieldFrame>
                )
            })}
        </>
    )
}
