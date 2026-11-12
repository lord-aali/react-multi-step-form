import type {ReactNode} from "react"

export type RichText = string | ReactNode

export type Direction = "rtl" | "ltr"

export type CompareOp = "eq" | "neq" | "in" | "notIn" | "empty" | "notEmpty" | "gt" | "lt"

export interface ShowWhen {
    field: string
    op: CompareOp
    value?: string | number | boolean | Array<string | number | boolean>
}

export interface DialogSpec {
    presentation: "alert" | "sheet"
    title?: string
    body: RichText
    confirmText?: string
    cancelText?: string
}

export interface FieldDialogs {
    beforeNext?: DialogSpec
    beforePrev?: DialogSpec
    onActivate?: DialogSpec
    onToggle?: DialogSpec
}

export interface FieldBase {
    name?: string
    dir?: Direction
    className?: string
    visibleWhen?: ShowWhen | ShowWhen[]
    match?: "all" | "any"
    dialogs?: FieldDialogs
    errorMessage?: string
    errorMessages?: Record<string, string>
}

export type ValidationRule =
    | { type: "required"; message?: string }
    | { type: "persianName"; message?: string }
    | { type: "digits"; message?: string }
    | { type: "numeric"; allowDecimal?: boolean; message?: string }
    | { type: "chars"; chars: string; message?: string }
    | { type: "minLength"; value: number; message?: string }
    | { type: "maxLength"; value: number; message?: string }
    | { type: "length"; min?: number; max?: number; message?: string }
    | { type: "range"; min?: number; max?: number; message?: string }
    | { type: "pattern"; value: string; message?: string }
    | { type: "email"; message?: string }
    | { type: "jalaliDate"; message?: string }
    | { type: "gregorianDate"; message?: string }

/** Runtime validator shape used by the validation engine (converted from field `rules`). */
export type FormValidator =
    | {
        slug: string
        type: "required"
        message?: string
    }
    | {
        slug: string
        type: "numeric"
        allowDecimal?: boolean
        message?: string
    }
    | {
        slug: string
        type: "chars"
        chars: string
        message?: string
    }
    | {
        slug: string
        type: "persianName"
        message?: string
    }
    | {
        slug: string
        type: "range"
        min?: number
        max?: number
        message?: string
    }
    | {
        slug: string
        type: "length"
        min?: number
        max?: number
        message?: string
    }
    | {
        slug: string
        type: "email"
        message?: string
    }
    | {
        slug: string
        type: "pattern"
        pattern: string
        message?: string
    }
    | {
        slug: string
        type: "jalaliDate"
        message?: string
    }
    | {
        slug: string
        type: "gregorianDate"
        message?: string
    }

export interface TextFieldSchema extends FieldBase {
    type: "text"
    name: string
    label?: string
    placeholder?: string
    inputType?: "text" | "tel" | "email" | "number"
    required?: boolean
    /** Minimum input length. Also enforced during validation when the field has a value. */
    minLength?: number
    /** Maximum input length. Applied as the input `maxLength` and blocks longer typing. */
    maxLength?: number
    rules?: ValidationRule[]
    defaultValue?: string
}

export interface RadioOption {
    value: string
    label: string
    hidden?: boolean
}

export interface RadioFieldSchema extends FieldBase {
    type: "radio"
    name: string
    label?: string
    required?: boolean
    options: RadioOption[]
    defaultValue?: string
}

export interface StageOption {
    value: string
    label: string
    hidden?: boolean
    items?: FormItem[]
}

export interface StageFieldSchema extends FieldBase {
    type: "stage"
    name: string
    label?: string
    required?: boolean
    options: StageOption[]
    defaultValue?: string
}

export interface SelectItem {
    title: string
    value?: string
    items?: FormItem[]
}

export interface SelectFieldSchema extends FieldBase {
    type: "select"
    name: string
    title: string
    required?: boolean
    items: SelectItem[]
    placeholder?: string
    defaultValue?: string
}

export type DateCalendar = "jalali" | "gregorian"

export interface DateFieldSchema extends FieldBase {
    type: "date"
    name: string
    title: string
    dialogTitle?: string
    placeholder?: string
    required?: boolean
    /** Calendar system for the wheel picker. Default: `"jalali"`. */
    calendar?: DateCalendar
    yearRange?: { min?: number; max?: number }
    formatMonthPreview?: "string" | "numeric"
    defaultValue?: string
}

export interface FileFieldSchema extends FieldBase {
    type: "file"
    name: string
    placeholder: string
    imagePlaceholder?: string
    camera?: "advanced" | "native"
    isVideo?: boolean
    sources?: Array<"camera" | "gallery">
    maxFileSize?: number
    required?: boolean
    rejectNameIncludes?: string[]
    useRear?: boolean
    allowChangeCamera?: boolean
    aspectRatio?: string
    width?: number
    height?: number
    captureHintTop?: RichText
    captureHintBottom?: RichText
    confirmHintTop?: RichText
    confirmHintBottom?: RichText
}

export interface AgreementFieldSchema extends FieldBase {
    type: "agreement"
    name: string
    label: string
    required?: boolean
    terms?: {
        title: string
        body: RichText
        presentation?: "static" | "alert" | "sheet"
    }
}


export interface TypographySchema extends FieldBase {
    type: "typography"
    variant: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span"
    text: RichText
    color?: string
    align?: "inherit" | "left" | "center" | "right" | "justify"
}

export type FormItem =
    | TextFieldSchema
    | RadioFieldSchema
    | StageFieldSchema
    | SelectFieldSchema
    | DateFieldSchema
    | FileFieldSchema
    | AgreementFieldSchema
    | TypographySchema

export interface FormPage {
    id: string
    title?: string
    description?: RichText
    nextLabel?: string
    prevLabel?: string
    skipWhen?: ShowWhen | ShowWhen[]
    match?: "all" | "any"
    beforeNext?: DialogSpec
    beforePrev?: DialogSpec
    items: FormItem[]
}

export interface FormTexts {
    next: string
    prev: string
    submit: string
    edit: string
    loading: string
    uploading: string
    required: string
    invalid: string
    selectPlaceholder: string
    confirm: string
    cancel: string
    cameraImage: string
    cameraVideo: string
    galleryPick: string
    uploadImage: string
    uploadVideo: string
    sendImage: string
    sendVideo: string
    retakeImage: string
    retakeVideo: string
    networkError: string
    fixErrors: string
    agreeRequired: string
    fileRequired: string
    understood: string
    finishedTitle: string
    finishedBody: string
    permissionDenied: string
}

export interface FormSchema {
    /** Form id; must match a server table `slug`. Sent to the API as `id`. */
    id: string
    /** Base URL for the form API (e.g. "/api" or "https://example.com/api"). Overridden by the MultiStepForm `apiBase` prop when that prop is set. */
    apiBase?: string
    /**
     * Field name that matches server `resumeColumn` (e.g. "phone").
     * When this field is filled and there is no row yet, Next resumes/creates via `/resume`.
     */
    resumeColumn?: string
    dir?: Direction
    texts?: Partial<FormTexts>
    pages: FormPage[]
}
