import type {FormItem, FormTexts, FormValidator, ValidationRule} from "./schema"
import {validateNumbers, validatePersianNameField} from "./tapsiValidation"

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

/**
 * Resolves validator definitions for a field.
 * - Missing or empty `validators` → optional (returns []).
 * - Slugs that are not in the schema list are ignored.
 * - If every slug is missing from the list, the field is optional.
 * - Legacy `rules` / `required` apply only when `validators` is omitted.
 */
export function resolveFieldValidators(item: FormItem, map: ValidatorMap): FormValidator[] {
    if (item.type === "typography") return []

    if (item.validators !== undefined) {
        return item.validators.map((slug) => map[slug]).filter((entry): entry is FormValidator => !!entry)
    }

    if (item.type === "text" && item.rules?.length) {
        return item.rules.map((rule, index) =>
            legacyRuleAsValidator(rule, `__legacy_${item.name}_${rule.type}_${index}`),
        )
    }

    if ("required" in item && item.required === true) {
        return [{slug: "__legacy_required", type: "required", message: item.errorMessage}]
    }

    return []
}

export function isFieldRequired(item: FormItem, map: ValidatorMap): boolean {
    return resolveFieldValidators(item, map).length > 0
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

function legacyRuleAsValidator(rule: ValidationRule, slug: string): FormValidator {
    switch (rule.type) {
        case "digits":
            return {slug, type: "numeric", message: rule.message}
        case "persianName":
            return {slug, type: "persianName", message: rule.message}
        case "minLength":
            return {slug, type: "length", min: rule.value, message: rule.message}
        case "maxLength":
            return {slug, type: "length", max: rule.value, message: rule.message}
        case "email":
            return {slug, type: "email", message: rule.message}
        case "pattern":
            return {slug, type: "pattern", pattern: rule.value, message: rule.message}
        case "required":
            return {slug, type: "required", message: rule.message}
        default:
            return {slug, type: "required"}
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
        return messageFor(
            item,
            required?.slug ?? validators[0].slug,
            required?.message ?? validators[0].message,
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

export {DIGITS, EMAIL, JALALI}
