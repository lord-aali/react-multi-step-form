import {createContext, useContext} from "react"
import type {DialogSpec, Direction, FormTexts} from "./schema"
import type {FormStore} from "./store"
import type {ValidatorMap} from "./validators"

export interface FormContextValue {
    store: FormStore
    texts: FormTexts
    dir: Direction
    validators: ValidatorMap
    ask: (spec: DialogSpec) => Promise<boolean>
}

const FormContext = createContext<FormContextValue | null>(null)

export const FormContextProvider = FormContext.Provider

export function useFormContext(): FormContextValue {
    const value = useContext(FormContext)
    if (!value) throw new Error("Form fields must render inside MultiStepForm")
    return value
}
