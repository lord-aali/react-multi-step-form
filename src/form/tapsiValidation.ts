/**
 * Port of TapsiLandings `common/functions.tsx` text checks:
 * `checkValidation`, `validatePersianText`, `validateNumbers`.
 */

/** Same string as Tapsi `validatePersianText`. */
export const TAPSI_PERSIAN_CHARS = "ابپتثجچحخدذرزژسشصضطظعغفکگقلمنوهیئيؤآ "

/** Same string as Tapsi `validateNumbers`. */
export const TAPSI_DIGIT_CHARS = "0123456789"

/** Tapsi `checkValidation(allowedChars, check)`. */
export function checkValidation(allowedChars: string, check: string): boolean {
    let isOk = true
    check.split("").forEach((char) => {
        if (allowedChars.indexOf(char) === -1) {
            isOk = false
        }
    })
    return isOk
}

/** Tapsi `validatePersianText`. */
export function validatePersianText(check: string): boolean {
    return checkValidation(TAPSI_PERSIAN_CHARS, check)
}

/** Tapsi `validateNumbers`. */
export function validateNumbers(check: string): boolean {
    return checkValidation(TAPSI_DIGIT_CHARS, check)
}

/**
 * Driver/bike register identity rules from TapsiLandings:
 * Persian fields require non-empty trimmed text that passes `validatePersianText`.
 */
export function validatePersianNameField(check: string): boolean {
    return validatePersianText(check) && check.trim().length > 0
}

/**
 * Birth certificate number: 1–10 English digits (`DriverRegisterForm` / `BikeRegisterForm`).
 */
export function validateBirthCertNumber(check: string): boolean {
    return check.length >= 1 && check.length <= 10 && validateNumbers(check)
}
