/**
 * Templates feature public API.
 * Import from '@/features/templates' for all template-related functionality.
 */
export { TemplatePicker } from './components/TemplatePicker';
export { TemplateCard } from './components/TemplateCard';
export { SaveAsTemplateDialog } from './components/SaveAsTemplateDialog';
export { useTemplatePicker } from './hooks/useTemplatePicker';
export { instantiateTemplate } from './services/templateInstantiator';
export { BUILT_IN_TEMPLATES } from './services/templateDefinitions';
export { saveTemplate, getCustomTemplates, deleteCustomTemplate } from './services/customTemplateService';
export type { WorkspaceTemplate, TemplateNode, TemplateEdge, TemplateCategory } from './types/template';
export { MAX_CUSTOM_TEMPLATES } from './types/template';
