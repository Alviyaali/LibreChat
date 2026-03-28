import {
  WebSearchToolDefinition,
  CalculatorToolDefinition,
  CodeExecutionToolDefinition,
} from '@librechat/agents';
import { geminiToolkit } from '~/tools/toolkits/gemini';
import { oaiToolkit } from '~/tools/toolkits/oai';

/** Extended JSON Schema type that includes standard validation keywords */
export type ExtendedJsonSchema = {
  type?: 'string' | 'number' | 'integer' | 'float' | 'boolean' | 'array' | 'object' | 'null';
  enum?: (string | number | boolean | null)[];
  items?: ExtendedJsonSchema;
  properties?: Record<string, ExtendedJsonSchema>;
  required?: string[];
  description?: string;
  additionalProperties?: boolean | ExtendedJsonSchema;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  format?: string;
  default?: unknown;
  const?: unknown;
  oneOf?: ExtendedJsonSchema[];
  anyOf?: ExtendedJsonSchema[];
  allOf?: ExtendedJsonSchema[];
  $ref?: string;
  $defs?: Record<string, ExtendedJsonSchema>;
  definitions?: Record<string, ExtendedJsonSchema>;
};

export interface ToolRegistryDefinition {
  name: string;
  description: string;
  schema: ExtendedJsonSchema;
  description_for_model?: string;
  responseFormat?: 'content_and_artifact' | 'content';
  toolType: 'builtin' | 'mcp' | 'action' | 'custom';
}

/** Google Search tool JSON schema */
export const googleSearchSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      description: 'The search query string.',
    },
    max_results: {
      type: 'integer',
      minimum: 1,
      maximum: 10,
      description: 'The maximum number of search results to return. Defaults to 5.',
    },
  },
  required: ['query'],
};

/** DALL-E 3 tool JSON schema */
export const dalle3Schema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      maxLength: 4000,
      description:
        'A text description of the desired image, following the rules, up to 4000 characters.',
    },
    style: {
      type: 'string',
      enum: ['vivid', 'natural'],
      description:
        'Must be one of `vivid` or `natural`. `vivid` generates hyper-real and dramatic images, `natural` produces more natural, less hyper-real looking images',
    },
    quality: {
      type: 'string',
      enum: ['hd', 'standard'],
      description: 'The quality of the generated image. Only `hd` and `standard` are supported.',
    },
    size: {
      type: 'string',
      enum: ['1024x1024', '1792x1024', '1024x1792'],
      description:
        'The size of the requested image. Use 1024x1024 (square) as the default, 1792x1024 if the user requests a wide image, and 1024x1792 for full-body portraits. Always include this parameter in the request.',
    },
  },
  required: ['prompt', 'style', 'quality', 'size'],
};

/** Flux API tool JSON schema */
export const fluxApiSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['generate', 'list_finetunes', 'generate_finetuned'],
      description:
        'Action to perform: "generate" for image generation, "generate_finetuned" for finetuned model generation, "list_finetunes" to get available custom models',
    },
    prompt: {
      type: 'string',
      description:
        'Text prompt for image generation. Required when action is "generate". Not used for list_finetunes.',
    },
    width: {
      type: 'number',
      description:
        'Width of the generated image in pixels. Must be a multiple of 32. Default is 1024.',
    },
    height: {
      type: 'number',
      description:
        'Height of the generated image in pixels. Must be a multiple of 32. Default is 768.',
    },
    prompt_upsampling: {
      type: 'boolean',
      description: 'Whether to perform upsampling on the prompt.',
    },
    steps: {
      type: 'integer',
      description: 'Number of steps to run the model for, a number from 1 to 50. Default is 40.',
    },
    seed: {
      type: 'number',
      description: 'Optional seed for reproducibility.',
    },
    safety_tolerance: {
      type: 'number',
      description:
        'Tolerance level for input and output moderation. Between 0 and 6, 0 being most strict, 6 being least strict.',
    },
    endpoint: {
      type: 'string',
      enum: [
        '/v1/flux-pro-1.1',
        '/v1/flux-pro',
        '/v1/flux-dev',
        '/v1/flux-pro-1.1-ultra',
        '/v1/flux-pro-finetuned',
        '/v1/flux-pro-1.1-ultra-finetuned',
      ],
      description: 'Endpoint to use for image generation.',
    },
    raw: {
      type: 'boolean',
      description:
        'Generate less processed, more natural-looking images. Only works for /v1/flux-pro-1.1-ultra.',
    },
    finetune_id: {
      type: 'string',
      description: 'ID of the finetuned model to use',
    },
    finetune_strength: {
      type: 'number',
      description: 'Strength of the finetuning effect (typically between 0.1 and 1.2)',
    },
    guidance: {
      type: 'number',
      description: 'Guidance scale for finetuned models',
    },
    aspect_ratio: {
      type: 'string',
      description: 'Aspect ratio for ultra models (e.g., "16:9")',
    },
  },
  required: [],
};

/** OpenWeather tool JSON schema */
export const openWeatherSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['help', 'current_forecast', 'timestamp', 'daily_aggregation', 'overview'],
      description: 'The action to perform',
    },
    city: {
      type: 'string',
      description: 'City name for geocoding if lat/lon not provided',
    },
    lat: {
      type: 'number',
      description: 'Latitude coordinate',
    },
    lon: {
      type: 'number',
      description: 'Longitude coordinate',
    },
    exclude: {
      type: 'string',
      description: 'Parts to exclude from the response',
    },
    units: {
      type: 'string',
      enum: ['Celsius', 'Kelvin', 'Fahrenheit'],
      description: 'Temperature units',
    },
    lang: {
      type: 'string',
      description: 'Language code',
    },
    date: {
      type: 'string',
      description: 'Date in YYYY-MM-DD format for timestamp and daily_aggregation',
    },
    tz: {
      type: 'string',
      description: 'Timezone',
    },
  },
  required: ['action'],
};

/** Wolfram Alpha tool JSON schema */
export const wolframSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    input: {
      type: 'string',
      description: 'Natural language query to WolframAlpha following the guidelines',
    },
  },
  required: ['input'],
};

/** Stable Diffusion tool JSON schema */
export const stableDiffusionSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      description:
        'Detailed keywords to describe the subject, using at least 7 keywords to accurately describe the image, separated by comma',
    },
    negative_prompt: {
      type: 'string',
      description:
        'Keywords we want to exclude from the final image, using at least 7 keywords to accurately describe the image, separated by comma',
    },
  },
  required: ['prompt', 'negative_prompt'],
};

/** Azure AI Search tool JSON schema */
export const azureAISearchSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Search word or phrase to Azure AI Search',
    },
  },
  required: ['query'],
};

/** Traversaal Search tool JSON schema */
export const traversaalSearchSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description:
        "A properly written sentence to be interpreted by an AI to search the web according to the user's request.",
    },
  },
  required: ['query'],
};

/** Tavily Search Results tool JSON schema */
export const tavilySearchSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      description: 'The search query string.',
    },
    max_results: {
      type: 'number',
      minimum: 1,
      maximum: 10,
      description: 'The maximum number of search results to return. Defaults to 5.',
    },
    search_depth: {
      type: 'string',
      enum: ['basic', 'advanced'],
      description:
        'The depth of the search, affecting result quality and response time (`basic` or `advanced`). Default is basic for quick results and advanced for indepth high quality results but longer response time. Advanced calls equals 2 requests.',
    },
    include_images: {
      type: 'boolean',
      description:
        'Whether to include a list of query-related images in the response. Default is False.',
    },
    include_answer: {
      type: 'boolean',
      description: 'Whether to include answers in the search results. Default is False.',
    },
    include_raw_content: {
      type: 'boolean',
      description: 'Whether to include raw content in the search results. Default is False.',
    },
    include_domains: {
      type: 'array',
      items: { type: 'string' },
      description: 'A list of domains to specifically include in the search results.',
    },
    exclude_domains: {
      type: 'array',
      items: { type: 'string' },
      description: 'A list of domains to specifically exclude from the search results.',
    },
    topic: {
      type: 'string',
      enum: ['general', 'news', 'finance'],
      description:
        'The category of the search. Use news ONLY if query SPECIFCALLY mentions the word "news".',
    },
    time_range: {
      type: 'string',
      enum: ['day', 'week', 'month', 'year', 'd', 'w', 'm', 'y'],
      description: 'The time range back from the current date to filter results.',
    },
    days: {
      type: 'number',
      minimum: 1,
      description: 'Number of days back from the current date to include. Only if topic is news.',
    },
    include_image_descriptions: {
      type: 'boolean',
      description:
        'When include_images is true, also add a descriptive text for each image. Default is false.',
    },
  },
  required: ['query'],
};

/** File Search tool JSON schema */
export const fileSearchSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description:
        "A natural language query to search for relevant information in the files. Be specific and use keywords related to the information you're looking for. The query will be used for semantic similarity matching against the file contents.",
    },
  },
  required: ['query'],
};

/** Contact Search tool JSON schema */
export const contactSearchSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'The person name to search for (partial or full match).' },
    companyName: { type: 'string', description: 'The company name to search for (partial or full match).' },
    role: { type: 'string', description: 'The job title, role, or designation to search for (partial or full match).' },
    email: { type: 'string', description: 'The email address to search for (partial or full match).' },
    phone: { type: 'string', description: 'The phone number or mobile number to search for.' },
    gender: { type: 'string', description: 'Filter by gender (e.g. "MALE", "FEMALE").' },
    city: { type: 'string', description: 'Filter by city name.' },
    state: { type: 'string', description: 'Filter by state or region name.' },
    pincode: { type: 'string', description: 'Filter by pincode / zip code.' },
    applicationStatus: { type: 'string', description: 'Filter by application status (e.g. "LEAD-NEW", "LEAD-INCOME").' },
    pan: { type: 'string', description: 'Filter by PAN number.' },
    dob: { type: 'string', description: 'Filter by date of birth (e.g. "19-09-1992").' },
    chatId: { type: 'string', description: 'Filter by chat_id.' },
    leadId: { type: 'string', description: 'Filter by lead_id.' },
    stateId: { type: 'string', description: 'Filter by state_id.' },
    kycSuccessful: { type: 'string', description: 'Filter by KYC success status.' },
    incomeVerifiedAa: { type: 'string', description: 'Filter by income verification status.' },
    applicationNo: { type: 'string', description: 'Filter by application number.' },
    loanNo: { type: 'string', description: 'Filter by loan number.' },
    industry: { type: 'string', description: 'Filter by industry.' },
    metadataField: { type: 'string', description: 'Name of any metadata field not listed above. Must be used together with metadataValue.' },
    metadataValue: { type: 'string', description: 'Value to match for the metadata field specified in metadataField.' },
  },
  required: [],
};

/** Contact Analytics tool JSON schema */
export const contactAnalyticsSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    groupBy: {
      type: 'string',
      description:'Field name to group/aggregate contacts by. Examples: "gender", "city", "state", "application_status", "pincode", "company", "role", "kyc_successful", "income_verified_aa", "dob". The result will show each distinct value and its count.',
    },
    countOnly: {
      type: 'boolean',
      description:'When true, returns only the total count of matching contacts without grouping. Useful for questions like "how many contacts are there?" or "how many contacts are male?"',
    },
    name: { type: 'string', description: 'Filter by person name (partial match).' },
    companyName: { type: 'string', description: 'Filter by company name (partial match).' },
    role: { type: 'string', description: 'Filter by job title or role (partial match).' },
    email: { type: 'string', description: 'Filter by email address (partial match).' },
    phone: { type: 'string', description: 'Filter by phone number.' },
    gender: { type: 'string', description: 'Filter by gender (e.g. "MALE", "FEMALE").' },
    city: { type: 'string', description: 'Filter by city name.' },
    state: { type: 'string', description: 'Filter by state or region name.' },
    pincode: { type: 'string', description: 'Filter by pincode / zip code.' },
    applicationStatus: { type: 'string', description: 'Filter by application status (e.g. "LEAD-NEW", "LEAD-INCOME").' },
    pan: { type: 'string', description: 'Filter by PAN number.' },
    dob: { type: 'string', description: 'Filter by date of birth (e.g. "19-09-1992").' },
    chatId: { type: 'string', description: 'Filter by chat_id.' },
    leadId: { type: 'string', description: 'Filter by lead_id.' },
    stateId: { type: 'string', description: 'Filter by state_id (workflow state identifier).' },
    kycSuccessful: { type: 'string', description: 'Filter by KYC success status.' },
    incomeVerifiedAa: { type: 'string', description: 'Filter by income verification via Account Aggregator.' },
    applicationNo: { type: 'string', description: 'Filter by application number.' },
    loanNo: { type: 'string', description: 'Filter by loan number.' },
    industry: { type: 'string', description: 'Filter by industry.' },
    metadataField: { type: 'string', description: 'Name of any metadata field not listed above. Must be used with metadataValue.' },
    metadataValue: { type: 'string', description: 'Value to match for the field specified in metadataField.' },
  },
  required: [],
};

/** Tool definitions registry - maps tool names to their definitions */
export const toolDefinitions: Record<string, ToolRegistryDefinition> = {
  google: {
    name: 'google',
    description:
      'A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events.',
    schema: googleSearchSchema,
    toolType: 'builtin',
  },
  dalle: {
    name: 'dalle',
    description: `Use DALLE to create images from text descriptions.
    - It requires prompts to be in English, detailed, and to specify image type and human features for diversity.
    - Create only one image, without repeating or listing descriptions outside the "prompts" field.
    - Maintains the original intent of the description, with parameters for image style, quality, and size to tailor the output.`,
    schema: dalle3Schema,
    toolType: 'builtin',
  },
  flux: {
    name: 'flux',
    description:
      'Use Flux to generate images from text descriptions. This tool can generate images and list available finetunes. Each generate call creates one image. For multiple images, make multiple consecutive calls.',
    schema: fluxApiSchema,
    toolType: 'builtin',
  },
  open_weather: {
    name: 'open_weather',
    description:
      'Provides weather data from OpenWeather One Call API 3.0. Actions: help, current_forecast, timestamp, daily_aggregation, overview. If lat/lon not provided, specify "city" for geocoding. Units: "Celsius", "Kelvin", or "Fahrenheit" (default: Celsius). For timestamp action, use "date" in YYYY-MM-DD format.',
    schema: openWeatherSchema,
    toolType: 'builtin',
  },
  wolfram: {
    name: 'wolfram',
    description:
      'WolframAlpha offers computation, math, curated knowledge, and real-time data. It handles natural language queries and performs complex calculations. Follow the guidelines to get the best results.',
    schema: wolframSchema,
    toolType: 'builtin',
  },
  'stable-diffusion': {
    name: 'stable-diffusion',
    description:
      "You can generate images using text with 'stable-diffusion'. This tool is exclusively for visual content.",
    schema: stableDiffusionSchema,
    toolType: 'builtin',
  },
  'azure-ai-search': {
    name: 'azure-ai-search',
    description: "Use the 'azure-ai-search' tool to retrieve search results relevant to your input",
    schema: azureAISearchSchema,
    toolType: 'builtin',
  },
  traversaal_search: {
    name: 'traversaal_search',
    description:
      'An AI search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events. Input should be a search query.',
    schema: traversaalSearchSchema,
    toolType: 'builtin',
  },
  tavily_search_results_json: {
    name: 'tavily_search_results_json',
    description:
      'A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events.',
    schema: tavilySearchSchema,
    toolType: 'builtin',
  },
  file_search: {
    name: 'file_search',
    description:
      'Performs semantic search across attached "file_search" documents using natural language queries. This tool analyzes the content of uploaded files to find relevant information, quotes, and passages that best match your query.',
    schema: fileSearchSchema,
    toolType: 'builtin',
    responseFormat: 'content_and_artifact',
  },
  image_gen_oai: {
    name: oaiToolkit.image_gen_oai.name,
    description: oaiToolkit.image_gen_oai.description,
    schema: oaiToolkit.image_gen_oai.schema,
    toolType: 'builtin',
    responseFormat: oaiToolkit.image_gen_oai.responseFormat,
  },
  image_edit_oai: {
    name: oaiToolkit.image_edit_oai.name,
    description: oaiToolkit.image_edit_oai.description,
    schema: oaiToolkit.image_edit_oai.schema,
    toolType: 'builtin',
    responseFormat: oaiToolkit.image_edit_oai.responseFormat,
  },
  gemini_image_gen: {
    name: geminiToolkit.gemini_image_gen.name,
    description: geminiToolkit.gemini_image_gen.description,
    schema: geminiToolkit.gemini_image_gen.schema,
    toolType: 'builtin',
    responseFormat: geminiToolkit.gemini_image_gen.responseFormat,
  },

  contact_search: {
    name: 'contact_search',
    description:
      'Search the internal contacts database for people. ' +
      'Searchable fields: name, company, role, email, phone, gender, city, state, pincode, ' +
      'applicationStatus (e.g. LEAD-NEW, LEAD-INCOME), pan, dob, chatId, leadId, stateId, ' +
      'kycSuccessful, incomeVerifiedAa, applicationNo, loanNo, industry. ' +
      'Use metadataField + metadataValue for any other metadata key. ' +
      'All parameters are optional and combined with AND logic. ' +
      'Returns up to 50 matching contacts with their full details. ' +
      'For counting or statistical questions (how many, breakdown by, distribution), ' +
      'use the contact_analytics tool instead.',
    schema: contactSearchSchema,
    toolType: 'builtin',
  },

  contact_analytics: {
    name: 'contact_analytics',
    description:
      'Get counts, totals, and statistical breakdowns of contacts. ' +
      'Use this tool for quantitative questions: "how many contacts?", ' +
      '"how many are male/female?", "breakdown by city", "contacts per state", ' +
      '"application status distribution", "how many LEAD-NEW?". ' +
      'Set countOnly=true for simple totals. Set groupBy to a field name for breakdowns. ' +
      'All filter parameters (name, company, gender, city, state, pincode, applicationStatus, ' +
      'pan, dob, chatId, leadId, kycSuccessful, incomeVerifiedAa, applicationNo, loanNo, etc.) ' +
      'can be combined with groupBy or countOnly to narrow the scope. ' +
      'For looking up specific contact details, use the contact_search tool instead.',
    schema: contactAnalyticsSchema,
    toolType: 'builtin',
  },
};


/** Tool definitions from @librechat/agents */
const agentToolDefinitions: Record<string, ToolRegistryDefinition> = {
  [CalculatorToolDefinition.name]: {
    name: CalculatorToolDefinition.name,
    description: CalculatorToolDefinition.description,
    schema: CalculatorToolDefinition.schema as unknown as ExtendedJsonSchema,
    toolType: 'builtin',
  },
  [CodeExecutionToolDefinition.name]: {
    name: CodeExecutionToolDefinition.name,
    description: CodeExecutionToolDefinition.description,
    schema: CodeExecutionToolDefinition.schema as unknown as ExtendedJsonSchema,
    toolType: 'builtin',
  },
  [WebSearchToolDefinition.name]: {
    name: WebSearchToolDefinition.name,
    description: WebSearchToolDefinition.description,
    schema: WebSearchToolDefinition.schema as unknown as ExtendedJsonSchema,
    toolType: 'builtin',
  },
};

export function getToolDefinition(toolName: string): ToolRegistryDefinition | undefined {
  return toolDefinitions[toolName] ?? agentToolDefinitions[toolName];
}

export function getAllToolDefinitions(): ToolRegistryDefinition[] {
  return [...Object.values(toolDefinitions), ...Object.values(agentToolDefinitions)];
}

export function getToolSchema(toolName: string): ExtendedJsonSchema | undefined {
  return getToolDefinition(toolName)?.schema;
}
