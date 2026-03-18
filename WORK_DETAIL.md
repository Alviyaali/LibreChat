# Contact Integration - Work Detail

## Table of Contents

1. [Project Structure Overview](#project-structure-overview)
2. [Files Created/Modified by Workspace](#files-createdmodified-by-workspace)
3. [Backend Files](#backend-files)
4. [Shared Data Layer Files](#shared-data-layer-files)
5. [Frontend Files](#frontend-files)
6. [Database Schema Files](#database-schema-files)
7. [Configuration Files](#configuration-files)
8. [File Relationships](#file-relationships)

---

## Project Structure Overview

The contact integration spans across multiple workspaces in the LibreChat monorepo:

```
LibreChat/
├── api/                                    # Backend (JavaScript)
│   ├── app/clients/tools/structured/       # LangChain tools
│   ├── server/
│   │   ├── controllers/                    # Business logic
│   │   └── routes/                         # API routes
│   └── db/models/                          # Model exports
│
├── packages/
│   ├── data-schemas/                       # Database schemas (TypeScript)
│   │   ├── src/
│   │   │   ├── schema/                     # Mongoose schemas
│   │   │   ├── models/                     # Model factories
│   │   │   └── types/                      # TypeScript interfaces
│   │   └── dist/                           # Compiled output
│   │
│   └── data-provider/                      # Shared API layer (TypeScript)
│       └── src/
│           ├── api-endpoints.ts            # Endpoint URLs
│           ├── data-service.ts             # API client functions
│           ├── keys.ts                     # Query/Mutation keys
│           └── types/contacts.ts           # Contact types
│
└── client/                                 # Frontend (TypeScript/React)
    └── src/
        ├── components/
        │   ├── Contacts/                   # Contact components
        │   └── SidePanel/Contacts/         # Side panel components
        ├── data-provider/Contacts/         # React Query hooks
        ├── locales/en/                     # Translations
        └── routes/                         # Route configuration
```

---

## Files Created/Modified by Workspace

### Backend (`/api`)

**Created Files**:
1. `api/app/clients/tools/structured/ContactSearch.js` - LangChain tool for LLM
2. `api/server/controllers/contacts.js` - CRUD controllers
3. `api/server/routes/contacts.js` - Express routes

**Modified Files**:
1. `api/db/models.js` - Added Contact model export
2. `api/server/routes/index.js` - Registered contacts router

### Shared Data Layer (`/packages`)

**Created Files** (data-provider):
1. `packages/data-provider/src/types/contacts.ts` - TypeScript types

**Modified Files** (data-provider):
1. `packages/data-provider/src/api-endpoints.ts` - Added contact endpoints
2. `packages/data-provider/src/data-service.ts` - Added contact API functions
3. `packages/data-provider/src/keys.ts` - Added contact query/mutation keys
4. `packages/data-provider/src/index.ts` - Exported contact types

**Created Files** (data-schemas):
1. `packages/data-schemas/src/schema/contact.ts` - Mongoose schema
2. `packages/data-schemas/src/models/contact.ts` - Model factory
3. `packages/data-schemas/src/types/contact.ts` - TypeScript interface

**Modified Files** (data-schemas):
1. `packages/data-schemas/src/schema/index.ts` - Exported contact schema
2. `packages/data-schemas/src/models/index.ts` - Exported contact model
3. `packages/data-schemas/src/types/index.ts` - Exported contact types

### Frontend (`/client`)

**Created Files**:
1. `client/src/components/Contacts/ContactsPage.tsx` - Full page component
2. `client/src/components/Contacts/DeleteAllDialog.tsx` - Bulk delete dialog
3. `client/src/components/Contacts/index.ts` - Component exports
4. `client/src/data-provider/Contacts/mutations.ts` - React Query mutations
5. `client/src/data-provider/Contacts/queries.ts` - React Query queries
6. `client/src/data-provider/Contacts/index.ts` - Hook exports

**Modified Files**:
1. `client/src/components/SidePanel/Contacts/ContactsPanel.tsx` - Simplified to navigation
2. `client/src/routes/index.tsx` - Added /contacts route
3. `client/src/locales/en/translation.json` - Added contact-related keys
4. `client/src/data-provider/index.ts` - Exported contact hooks

### Assets

**New File Added**:
1. `client/public/assets/Contact Search Tool.svg` - Icon for contacts feature

---

## Backend Files

### 1. `api/app/clients/tools/structured/ContactSearch.js`

**Purpose**: LangChain tool that enables LLM to search contacts database

**Key Components**:


```javascript
class ContactSearch extends Tool {
  name = 'contact_search'
  description = 'Search the internal contacts database...'
  schema = contactSearchJsonSchema
  userId: string
  
  _buildFilter(input) { /* Builds MongoDB filter */ }
  _formatResults(contacts) { /* Formats for LLM */ }
  async _call(input) { /* Executes search */ }
}
```

**Responsibilities**:
- Accept structured parameters from LLM (companyName, personName, role, industry)
- Build MongoDB query with user scoping
- Execute database search (max 20 results)
- Format results as text for LLM consumption
- Handle errors gracefully

**Integration Point**: Registered with LangChain client when conversation starts

**Dependencies**:
- `@langchain/core/tools` - Base Tool class
- `~/db/models` - Contact model
- `@librechat/data-schemas` - Logger

---

### 2. `api/server/controllers/contacts.js`

**Purpose**: Business logic for all contact CRUD operations

**Exported Functions**:

1. **getContacts(req, res)**
   - Lists contacts with pagination and search
   - Query params: page, limit, search
   - Returns: { contacts, total, page, totalPages }

2. **createContact(req, res)**
   - Creates new contact
   - Body: { name, company, role, email, phone, notes, metadata }
   - Returns: Created contact (201)

3. **getContactById(req, res)**
   - Retrieves single contact
   - Params: id
   - Returns: Contact object (200) or 404

4. **updateContact(req, res)**
   - Updates existing contact
   - Params: id
   - Body: Partial contact object
   - Returns: Updated contact (200) or 404

5. **deleteContact(req, res)**
   - Deletes single contact
   - Params: id
   - Returns: 204 No Content or 404

6. **deleteAllContacts(req, res)**
   - Deletes all user's contacts
   - Returns: { deleted: number }

7. **uploadContactsCsv(req, res)**
   - Streams CSV file and imports contacts
   - Uses batch processing (5,000 rows per batch)
   - Returns: { message, count, skipped, totalRows }

**Helper Functions**:

1. **transformRow(row, userId)**
   - Maps CSV columns to contact schema
   - Handles name composition (first/middle/last)
   - Applies column aliases
   - Stores unknown columns in metadata

2. **flushBatch(batch)**
   - Inserts batch into MongoDB
   - Uses ordered: false for resilience
   - Returns: { inserted, skipped }

**Key Features**:
- All queries scoped to `createdBy: req.user.id`
- Streaming CSV processing for memory efficiency
- Backpressure handling (pause/resume)
- Comprehensive error handling and logging

**Dependencies**:
- `fs` - File system operations
- `csv-parser` - CSV streaming
- `~/db/models` - Contact model
- `@librechat/data-schemas` - Logger

---

### 3. `api/server/routes/contacts.js`

**Purpose**: Express router configuration for contact endpoints

**Route Definitions**:

```javascript
const router = express.Router();

// Middleware
router.use(requireJwtAuth);  // All routes require authentication

// Routes
router.get('/', getContacts);              // List contacts
router.post('/', createContact);           // Create contact
router.post('/upload', uploadContactsCsv); // Upload CSV
router.get('/:id', getContactById);        // Get single contact
router.patch('/:id', updateContact);       // Update contact
router.delete('/:id', deleteContact);      // Delete contact
router.delete('/', deleteAllContacts);     // Delete all contacts
```

**Route Order Importance**:
- `/upload` must come before `/:id` to avoid treating "upload" as an ID
- DELETE `/` must come before DELETE `/:id` for same reason

**Middleware Applied**:
- `requireJwtAuth` - Validates JWT token, attaches user to req.user
- `multer` - Handles file uploads for CSV endpoint

**Dependencies**:
- `express` - Router
- `~/server/middleware` - Authentication middleware
- `~/server/controllers/contacts` - Controller functions

---

## Shared Data Layer Files

### 4. `packages/data-provider/src/types/contacts.ts`

**Purpose**: TypeScript type definitions for contact data structures

**Exported Types**:

1. **TContact** - Contact document shape
```typescript
{
  id?: string;
  name?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
```

2. **ContactListParams** - Query parameters for listing
```typescript
{
  search?: string;
  page?: number;
  limit?: number;
}
```

3. **ContactListResponse** - Paginated list response
```typescript
{
  contacts: TContact[];
  total: number;
  page: number;
  totalPages: number;
}
```

4. **CreateContactPayload** - Create/update payload
5. **UpdateContactPayload** - Update with ID
6. **uploadContactsOptions** - CSV upload options
7. **ContactMutationCallback** - Mutation callbacks
8. **DeleteContactMutationOptions** - Delete callbacks
9. **UploadContactsMutationOptions** - Upload callbacks
10. **DeleteAllContactsResponse** - Bulk delete response
11. **DeleteAllContactsMutationOptions** - Bulk delete callbacks

**Usage**: Shared between frontend and backend for type safety

---

### 5. `packages/data-provider/src/api-endpoints.ts`

**Purpose**: Centralized API endpoint URL definitions

**Added Endpoints**:

```typescript
const contactsRoot = `${BASE_URL}/api/contacts`;

export const contacts = (params?: Record<string, unknown>) =>
  `${contactsRoot}${params ? buildQuery(params) : ''}`;

export const contactById = (id: string) => 
  `${contactsRoot}/${encodeURIComponent(id)}`;

export const contactUpload = () => 
  `${contactsRoot}/upload`;

export const contactsDeleteAll = () => 
  contactsRoot;
```

**Benefits**:
- Single source of truth for URLs
- Type-safe URL construction
- Automatic query string building
- URL encoding handled automatically

---

### 6. `packages/data-provider/src/data-service.ts`

**Purpose**: HTTP client functions for contact API

**Added Functions**:

1. **listContacts(params?)**
   - GET /api/contacts
   - Returns: ContactListResponse

2. **getContactById(id)**
   - GET /api/contacts/:id
   - Returns: TContact

3. **createContact(payload)**
   - POST /api/contacts
   - Returns: TContact

4. **updateContact({ id, data })**
   - PATCH /api/contacts/:id
   - Returns: TContact

5. **deleteContact(id)**
   - DELETE /api/contacts/:id
   - Returns: void

6. **deleteAllContacts()**
   - DELETE /api/contacts
   - Returns: DeleteAllContactsResponse

7. **uploadContactsCsv(formData, options?)**
   - POST /api/contacts/upload
   - Supports upload progress callback
   - Returns: { count: number }

**Implementation Pattern**:
```typescript
export function listContacts(params?: ContactListParams): Promise<ContactListResponse> {
  return request.get(endpoints.contacts(params as Record<string, unknown>));
}
```

**Dependencies**:
- `request` - HTTP client wrapper
- `endpoints` - URL builders
- Contact types

---

### 7. `packages/data-provider/src/keys.ts`

**Purpose**: React Query cache key definitions

**Added Keys**:

```typescript
export enum QueryKeys {
  // ... existing keys
  contacts = 'contacts',
}

export enum MutationKeys {
  // ... existing keys
  createContact = 'createContact',
  updateContact = 'updateContact',
  deleteContact = 'deleteContact',
  deleteAllContacts = 'deleteAllContacts',
  uploadContacts = 'uploadContacts',
}
```

**Usage**: Ensures consistent cache key usage across app

---

### 8. `packages/data-schemas/src/schema/contact.ts`

**Purpose**: Mongoose schema definition for Contact collection

**Schema Definition**:

```typescript
const contactSchema = new Schema<IContact>({
  name: { type: String, index: true },
  company: { type: String, index: true },
  role: { type: String },
  email: { type: String, index: true },
  phone: { type: String, index: true },
  notes: { type: String },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Compound index for common query pattern
contactSchema.index({ company: 1, name: 1 });
```

**Indexes**:
- Single field indexes on name, company, email, phone
- Compound index on company + name
- Automatic timestamps (createdAt, updatedAt)

**Design Decisions**:
- `metadata` as Mixed type for flexibility
- Indexes on searchable fields for performance
- `createdBy` reference to User for data isolation

---

### 9. `packages/data-schemas/src/models/contact.ts`

**Purpose**: Model factory function for Contact

**Implementation**:

```typescript
export function createContactModel(mongoose: typeof import('mongoose')) {
  return mongoose.models.Contact || mongoose.model<IContact>('Contact', contactSchema);
}
```

**Pattern**: Prevents model redefinition errors in development

---

### 10. `packages/data-schemas/src/types/contact.ts`

**Purpose**: TypeScript interface for Contact document

**Interface Definition**:

```typescript
export interface IContact {
  name?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
```

**Usage**: Type safety for Mongoose operations

---

## Frontend Files

### 11. `client/src/components/Contacts/ContactsPage.tsx`

**Purpose**: Full-page contact management interface

**Component Structure**:

```tsx
export default function ContactsPage() {
  // State
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  
  // Hooks
  const localize = useLocalize();
  const debouncedSearch = useDebounce(search, 300);
  
  // Render
  return (
    <div>
      <h1>{localize('com_sidepanel_contacts')}</h1>
      <FilterInput value={search} onChange={setSearch} />
      <ContactTable search={debouncedSearch} />
      <Button onClick={() => setAddOpen(true)}>Add</Button>
      <Button onClick={() => setUploadOpen(true)}>Upload</Button>
      <Button onClick={() => setDeleteAllOpen(true)}>Delete All</Button>
      
      <ContactFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
      <DeleteAllDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen} />
    </div>
  );
}
```

**Features**:
- Debounced search (300ms)
- Action buttons with tooltips
- Modal dialogs for actions
- Responsive layout
- Accessibility attributes

**Dependencies**:
- `lucide-react` - Icons
- `@librechat/client` - UI components
- `~/hooks` - Custom hooks
- Child components

---

### 12. `client/src/components/Contacts/DeleteAllDialog.tsx`

**Purpose**: Confirmation dialog for bulk delete operation

**Component Structure**:

```tsx
export default function DeleteAllDialog({ open, onOpenChange }) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const deleteAllMutation = useDeleteAllContactsMutation();
  
  const handleConfirm = () => {
    deleteAllMutation.mutate(undefined, {
      onSuccess: (data) => {
        showToast({ message: `Deleted ${data.deleted} contacts` });
        onOpenChange(false);
      },
      onError: (error) => {
        showToast({ message: 'Failed to delete contacts', status: 'error' });
      }
    });
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{localize('com_contacts_delete_all')}</AlertDialogTitle>
          <AlertDialogDescription>
            {localize('com_contacts_delete_all_confirm')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAllMutation.isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={deleteAllMutation.isLoading}
          >
            Delete All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Features**:
- Confirmation before destructive action
- Loading state during mutation
- Success/error toast notifications
- Disabled buttons during operation

---

### 13. `client/src/data-provider/Contacts/queries.ts`

**Purpose**: React Query hooks for fetching contact data

**Exported Hook**:

```typescript
export function useListContactsQuery(params?: ContactListParams) {
  return useQuery({
    queryKey: [QueryKeys.contacts, params],
    queryFn: () => dataService.listContacts(params),
    keepPreviousData: true,
    staleTime: 5000,
  });
}
```

**Features**:
- Automatic caching
- Background refetching
- Keep previous data during pagination
- 5 second stale time

---

### 14. `client/src/data-provider/Contacts/mutations.ts`

**Purpose**: React Query hooks for mutating contact data

**Exported Hooks**:

1. **useCreateContactMutation()**
2. **useUpdateContactMutation()**
3. **useDeleteContactMutation()**
4. **useDeleteAllContactsMutation()**
5. **useUploadContactsMutation()**

**Pattern**:

```typescript
export function useCreateContactMutation(options?: ContactMutationCallback) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: [MutationKeys.createContact],
    mutationFn: (payload: CreateContactPayload) => 
      dataService.createContact(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries([QueryKeys.contacts]);
      options?.onSuccess?.(data, variables, context);
    },
    onMutate: options?.onMutate,
    onError: options?.onError,
  });
}
```

**Features**:
- Automatic cache invalidation
- Callback support
- Type-safe parameters
- Error handling

---

### 15. `client/src/components/SidePanel/Contacts/ContactsPanel.tsx`

**Purpose**: Simplified side panel view (modified from original)

**Before** (Complex):
- Full contact table
- Search input
- Add/Upload buttons
- Multiple dialogs
- State management

**After** (Simple):
```tsx
export default function ContactsPanel() {
  const navigate = useNavigate();
  const localize = useLocalize();
  
  return (
    <div>
      <img 
        src="/assets/Contact Search Tool.svg" 
        alt="" 
        aria-hidden="true"
      />
      <Button onClick={() => navigate('/contacts')}>
        {localize('com_contacts_view_all')}
      </Button>
    </div>
  );
}
```

**Changes**:
- Removed table, search, dialogs
- Added icon display
- Single navigation button
- Minimal state

**Rationale**: Keep side panel clean, move complexity to dedicated page

---

### 16. `client/src/routes/index.tsx`

**Purpose**: Application route configuration

**Added Route**:

```tsx
{
  path: 'contacts',
  element: <ContactsPage />
}
```

**Location**: Inside authenticated `Root` layout, alongside other routes

---

### 17. `client/src/locales/en/translation.json`

**Purpose**: English translations for UI text

**Added Keys**:

```json
{
  "com_contacts_add": "Add contact",
  "com_contacts_view_all": "View all contacts",
  "com_contacts_delete_all": "Delete all contacts",
  "com_contacts_delete_all_confirm": "Are you sure you want to delete all contacts? This action cannot be undone.",
  "com_contacts_delete_all_success": "All contacts deleted successfully",
  "com_contacts_search_placeholder": "Search contacts...",
  "com_contacts_upload_csv": "Upload CSV",
  "com_ui_contact_deleted": "Contact deleted",
  "com_contacts_delete_description": "This action cannot be undone"
}
```


---

## File Relationships

### Data Flow Diagram

```
User Action
    │
    ▼
React Component (ContactsPage)
    │
    ▼
React Query Hook (useCreateContactMutation)
    │
    ▼
Data Service Function (createContact)
    │
    ▼
API Endpoint (endpoints.contacts())
    │
    ▼
HTTP Request (POST /api/contacts)
    │
    ▼
Express Router (contacts.js)
    │
    ▼
Controller (createContact)
    │
    ▼
Mongoose Model (Contact.create)
    │
    ▼
MongoDB (contacts collection)
```

### Type Flow

```
packages/data-schemas/src/types/contact.ts (IContact)
    │
    ├──▶ packages/data-schemas/src/schema/contact.ts (Schema<IContact>)
    │
    └──▶ packages/data-provider/src/types/contacts.ts (TContact)
            │
            ├──▶ client/src/data-provider/Contacts/*.ts (Hooks)
            │
            └──▶ client/src/components/Contacts/*.tsx (Components)
```

### Dependency Graph

```
client/src/components/Contacts/ContactsPage.tsx
    ├── client/src/data-provider/Contacts/queries.ts
    ├── client/src/data-provider/Contacts/mutations.ts
    ├── client/src/components/SidePanel/Contacts/ContactTable.tsx
    ├── client/src/components/SidePanel/Contacts/ContactFormDialog.tsx
    ├── client/src/components/SidePanel/Contacts/UploadModal.tsx
    └── client/src/components/Contacts/DeleteAllDialog.tsx

client/src/data-provider/Contacts/queries.ts
    ├── packages/data-provider/src/data-service.ts
    ├── packages/data-provider/src/keys.ts
    └── packages/data-provider/src/types/contacts.ts

packages/data-provider/src/data-service.ts
    ├── packages/data-provider/src/api-endpoints.ts
    └── packages/data-provider/src/types/contacts.ts

api/server/routes/contacts.js
    ├── api/server/controllers/contacts.js
    └── api/server/middleware/requireJwtAuth.js

api/server/controllers/contacts.js
    ├── api/db/models.js (Contact model)
    └── packages/data-schemas (logger)

api/app/clients/tools/structured/ContactSearch.js
    ├── @langchain/core/tools (Tool base class)
    ├── api/db/models.js (Contact model)
    └── packages/data-schemas (logger)
```

---

## Summary

### Files Created: 13

**Backend (3)**:
1. ContactSearch.js - LangChain tool
2. contacts.js - Controllers
3. contacts.js - Routes

**Data Schemas (3)**:
1. contact.ts - Schema
2. contact.ts - Model factory
3. contact.ts - TypeScript interface

**Data Provider (1)**:
1. contacts.ts - Type definitions

**Frontend (6)**:
1. ContactsPage.tsx - Full page component
2. DeleteAllDialog.tsx - Bulk delete dialog
3. index.ts - Component exports
4. queries.ts - Query hooks
5. mutations.ts - Mutation hooks
6. index.ts - Hook exports

### Files Modified: 11

**Backend (2)**:
1. api/db/models.js
2. api/server/routes/index.js

**Data Schemas (3)**:
1. packages/data-schemas/src/schema/index.ts
2. packages/data-schemas/src/models/index.ts
3. packages/data-schemas/src/types/index.ts

**Data Provider (4)**:
1. packages/data-provider/src/api-endpoints.ts
2. packages/data-provider/src/data-service.ts
3. packages/data-provider/src/keys.ts
4. packages/data-provider/src/index.ts

**Frontend (2)**:
1. client/src/components/SidePanel/Contacts/ContactsPanel.tsx
2. client/src/routes/index.tsx
3. client/src/locales/en/translation.json

### Total Impact: 24 files

This comprehensive integration touches all layers of the application stack while maintaining clean separation of concerns and following LibreChat's established patterns and conventions.
