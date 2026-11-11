export const PERSIAN_CHARS = "ابپتثجچحخدذرزژسشصضطظعغفکگقلمنوهیئيؤآ "

export const DIGIT_CHARS = "0123456789"

export function checkValidation(allowedChars: string, check: string): boolean {
    let isOk = true
    check.split("").forEach((char) => {
        if (allowedChars.indexOf(char) === -1) {
            isOk = false
        }
    })
    return isOk
}

export function validatePersianText(check: string): boolean {
    return checkValidation(PERSIAN_CHARS, check)
}

export function validateNumbers(check: string): boolean {
    return checkValidation(DIGIT_CHARS, check)
}

export function validatePersianNameField(check: string): boolean {
    return validatePersianText(check) && check.trim().length > 0
}

export function validateBirthCertNumber(check: string): boolean {
    return check.length >= 1 && check.length <= 10 && validateNumbers(check)
}
