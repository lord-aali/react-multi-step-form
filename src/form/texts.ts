import type {FormTexts} from "./schema"

export const defaultTexts: FormTexts = {
    next: "مرحله بعد",
    prev: "بازگشت",
    submit: "ثبت نهایی",
    edit: "ویرایش",
    loading: "لطفا کمی صبر کنید",
    uploading: "در حال آپلود",
    required: "این فیلد الزامی است.",
    invalid: "مقدار نامعتبر است.",
    selectPlaceholder: "انتخاب کنید",
    confirm: "تایید",
    cancel: "انصراف",
    cameraImage: "گرفتن عکس با دوربین",
    cameraVideo: "ضبط ویدیو با دوربین",
    galleryPick: "انتخاب از گالری",
    uploadImage: "بارگذاری تصویر",
    uploadVideo: "بارگذاری ویدیو",
    sendImage: "ارسال تصویر",
    sendVideo: "ارسال ویدیو",
    retakeImage: "گرفتن مجدد تصویر",
    retakeVideo: "گرفتن ویدیو جدید",
    networkError: "خطا در اتصال به سرور، درحال تلاش دوباره.",
    fixErrors: "لطفاً خطاهای مشخص شده را برطرف کنید.",
    agreeRequired: "پذیرش این مورد الزامی است.",
    fileRequired: "لطفا این فایل را انتخاب کنید.",
    understood: "متوجه شدم",
    finishedTitle: "در حال بررسی مدارک",
    finishedBody: "اطلاعات شما ثبت شد و در حال بررسی است.",
    permissionDenied: "مجوز داده نشد.",
}

export function resolveTexts(partial?: Partial<FormTexts>): FormTexts {
    return {...defaultTexts, ...partial}
}
