import {MultiStepForm} from "../index"
import {sampleForm} from "./sampleForm"

export function App() {
    const schemaUrl = new URLSearchParams(window.location.search).get("schema")
    if (schemaUrl) {
        return <MultiStepForm schemaUrl={schemaUrl}/>
    }
    return <MultiStepForm schema={sampleForm}/>
}
