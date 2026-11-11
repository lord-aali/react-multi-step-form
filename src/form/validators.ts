import type {FormItem, FormTexts, FormValidator, TextFieldSchema, ValidationRule} from "./schema"
import {validateNumbers, validatePersianNameField} from "./charValidation"

const DIGITS = /^[0-9]+$/
const DECIMAL = /^[0-9]+(\.[0-9]+)?$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const JALALI = /^\d{3,4}\/\d{1,2}\/\d{1,2}$/

export type ValidatorMap = Record<string, FormValidator>

export function indexValidators(list: FormValidator[] | undefined): ValidatorMap {
    const map: ValidatorMap = {}
    for (const entry of list ?? []) {
        if (entry?.slug) map[entry.slug] = entry
    }
    return map
}

function messageFor(
    item: FormItem,
    slug: string,
    fallback: string | undefined,
    texts: FormTexts,
    empty = false,
): string {
    return item.errorMessages?.[slug]
        || fallback
        || item.errorMessage
        || (empty ? texts.required : texts.invalid)
}

export function resolveFieldValidators(item: FormItem, _map: ValidatorMap = {}): FormValidator[] {
    if (item.type === "typography") return []

    const out: FormValidator[] = []

    if (item.type === "text" && item.rules?.length) {
        for (const rule of item.rules) {
            out.push(ruleAsValidator(rule))
        }
    }

    if (item.type === "text" && (item.min !== undefined || item.max !== undefined)) {
        const hasLengthRule = out.some((entry) => entry.type === "length")
        if (!hasLengthRule) {
            out.push({
                slug: "length",
                type: "length",
                min: item.min,
                max: item.max,
            })
        }
    }

    if ("required" in item && item.required === true && !out.some((entry) => entry.type === "required")) {
        out.unshift({slug: "required", type: "required", message: item.errorMessage})
    }

    return out
}

export function isFieldRequired(item: FormItem, map: ValidatorMap = {}): boolean {
    return resolveFieldValidators(item, map).some((entry) => entry.type === "required")
}

export function runValidator(
    validator: FormValidator,
    value: string,
    item: FormItem,
    texts: FormTexts,
): string | undefined {
    const msg = (fallback?: string) => messageFor(item, validator.slug, fallback ?? validator.message, texts)

    switch (validator.type) {
        case "required":
            return undefined
        case "numeric":
            if (validator.allowDecimal) {
                if (!DECIMAL.test(value)) return msg()
            } else if (!validateNumbers(value)) {
                return msg()
            }
            return undefined
        case "chars": {
            if (!validator.chars) return msg()
            for (const char of value) {
                if (!validator.chars.includes(char)) return msg()
            }
            return undefined
        }
        case "persianName":
            if (!validatePersianNameField(value)) return msg()
            return undefined
        case "range": {
            const number = Number(value)
            if (!Number.isFinite(number)) return msg()
            if (validator.min !== undefined && number < validator.min) return msg()
            if (validator.max !== undefined && number > validator.max) return msg()
            return undefined
        }
        case "length":
            if (validator.min !== undefined && value.length < validator.min) return msg()
            if (validator.max !== undefined && value.length > validator.max) return msg()
            return undefined
        case "email":
            if (!EMAIL.test(value)) return msg()
            return undefined
        case "pattern":
            try {
                if (!new RegExp(validator.pattern).test(value)) return msg()
            } catch {
                return msg()
            }
            return undefined
        case "jalaliDate":
            if (!JALALI.test(value)) return msg()
            return undefined
        default:
            return undefined
    }
}

function ruleAsValidator(rule: ValidationRule): FormValidator {
    switch (rule.type) {
        case "digits":
            return {slug: "digits", type: "numeric", message: rule.message}
        case "numeric":
            return {slug: "numeric", type: "numeric", allowDecimal: rule.allowDecimal, message: rule.message}
        case "persianName":
            return {slug: "persianName", type: "persianName", message: rule.message}
        case "chars":
            return {slug: "chars", type: "chars", chars: rule.chars, message: rule.message}
        case "minLength":
            return {slug: "minLength", type: "length", min: rule.value, message: rule.message}
        case "maxLength":
            return {slug: "maxLength", type: "length", max: rule.value, message: rule.message}
        case "length":
            return {slug: "length", type: "length", min: rule.min, max: rule.max, message: rule.message}
        case "range":
            return {slug: "range", type: "range", min: rule.min, max: rule.max, message: rule.message}
        case "email":
            return {slug: "email", type: "email", message: rule.message}
        case "pattern":
            return {slug: "pattern", type: "pattern", pattern: rule.value, message: rule.message}
        case "jalaliDate":
            return {slug: "jalaliDate", type: "jalaliDate", message: rule.message}
        case "required":
            return {slug: "required", type: "required", message: rule.message}
        default:
            return {slug: "required", type: "required"}
    }
}

export function validateScalarValue(
    item: FormItem,
    value: string,
    map: ValidatorMap,
    texts: FormTexts,
): string | undefined {
    const validators = resolveFieldValidators(item, map)
    if (!validators.length) return undefined

    if (!value) {
        const required = validators.find((entry) => entry.type === "required")
        if (!required) return undefined
        return messageFor(
            item,
            required.slug,
            required.message,
            texts,
            true,
        )
    }

    for (const validator of validators) {
        const error = runValidator(validator, value, item, texts)
        if (error) return error
    }
    return undefined
}

/** Clamp a text value to the field's optional `max` length. */
export function clampTextValue(item: TextFieldSchema, value: string): string {
    if (item.max === undefined || value.length <= item.max) return value
    return value.slice(0, item.max)
}

export {DIGITS, EMAIL, JALALI}
