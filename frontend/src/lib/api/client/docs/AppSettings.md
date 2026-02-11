
# AppSettings


## Properties

Name | Type
------------ | -------------
`llmProvider` | string
`llmModel` | string
`embeddingProvider` | string
`embeddingModel` | string
`ragEngine` | string
`retrievalMode` | string
`searchLimit` | number
`hybridAlpha` | number
`chunkSize` | number
`chunkOverlap` | number
`embeddingDim` | number
`neo4jUri` | string
`neo4jUser` | string
`neo4jPassword` | string
`theme` | string
`showReasoning` | boolean

## Example

```typescript
import type { AppSettings } from ''

// TODO: Update the object below with actual values
const example = {
  "llmProvider": null,
  "llmModel": null,
  "embeddingProvider": null,
  "embeddingModel": null,
  "ragEngine": null,
  "retrievalMode": null,
  "searchLimit": null,
  "hybridAlpha": null,
  "chunkSize": null,
  "chunkOverlap": null,
  "embeddingDim": null,
  "neo4jUri": null,
  "neo4jUser": null,
  "neo4jPassword": null,
  "theme": null,
  "showReasoning": null,
} satisfies AppSettings

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AppSettings
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


