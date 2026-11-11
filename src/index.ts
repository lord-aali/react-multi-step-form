import "./form/assets/fonts/vazirmatn/Vazirmatn-font-face.css"
import "./form/assets/fonts/vazirmatn-fd/Vazirmatn-font-face.css"
import "./form/form.css"

export {MultiStepForm} from "./form/MultiStepForm"
export type {MultiStepFormProps} from "./form/MultiStepForm"
export {createFormTheme} from "./form/theme/theme"
export {defaultTexts, resolveTexts} from "./form/texts"
export type {
    AgreementFieldSchema,
    CompareOp,
    DateFieldSchema,
    DialogSpec,
    Direction,
    FieldDialogs,
    FileFieldSchema,
    FormItem,
    FormPage,
    FormSchema,
    FormTexts,
    FormValidator,
    RadioFieldSchema,
    RichText,
    SelectFieldSchema,
    ShowWhen,
    StageFieldSchema,
    TextFieldSchema,
    TypographySchema,
    ValidationRule,
} from "./form/schema"
export {
    clampTextValue,
    fieldMaxLength,
    fieldMinLength,
    indexValidators,
    isFieldRequired,
    runValidator,
    sanitizeTextInput,
} from "./form/validators"
export {looksLikeHtml, sanitizeHtml, resolveRichText} from "./form/richText"
export {default as RichContent} from "./form/ui/RichContent"
export {
    DIGIT_CHARS,
    PERSIAN_CHARS,
    checkValidation,
    validateBirthCertNumber,
    validateNumbers,
    validatePersianNameField,
    validatePersianText,
} from "./form/charValidation"
