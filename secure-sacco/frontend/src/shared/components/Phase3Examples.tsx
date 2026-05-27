/**
 * Phase 3: Component Variants Usage Examples
 *
 * Shows how to use the new variant system with all UI primitives
 * This is a reference file - not used in production
 */

// Import patterns for usage in your components:
// import { Card, Button, Table, Panel } from '@/shared/components';
// import { PRESET_COMBOS, COMPOUND_VARIANTS, applyPreset } from '@/shared/design';

// ───────────────────────────────────────────────────────────────────────────
// CARD EXAMPLES
// ───────────────────────────────────────────────────────────────────────────

/**
 * Using simple variants:
 *
 * // Solid card - traditional look
 * <Card variant="solid" padding="md">Basic Content</Card>
 *
 * // Outline card - minimal look
 * <Card variant="outline" padding="lg">Outlined Content</Card>
 *
 * // Glass card - modern look
 * <Card variant="glass" padding="lg" shadow="sm">Glass Effect</Card>
 *
 * // Gradient card - premium look
 * <Card variant="gradient" padding="xl" shadow="md">Premium Content</Card>
 *
 * // Elevated card - emphasis look
 * <Card variant="elevated" padding="lg" shadow="lg">Important Content</Card>
 */

// ───────────────────────────────────────────────────────────────────────────
// BUTTON EXAMPLES
// ───────────────────────────────────────────────────────────────────────────

/**
 * Using button variants and sizes:
 *
 * // Primary button - main action
 * <Button variant="primary" size="md">Primary Action</Button>
 *
 * // Gradient button - CTA
 * <Button variant="gradient" size="lg" fullWidth>Call to Action</Button>
 *
 * // Ghost button - secondary action
 * <Button variant="ghost" size="md">Secondary Action</Button>
 *
 * // Danger button - destructive action
 * <Button variant="danger" size="md">Delete</Button>
 *
 * // Success button - confirm action
 * <Button variant="success" size="md">Complete</Button>
 */

// ... existing code ...

// ───────────────────────────────────────────────────────────────────────────
// PRESET USAGE
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// PRESET USAGE
// ───────────────────────────────────────────────────────────────────────────

/**
 * Using ready-made presets:
 *
 * import { applyPreset } from '@/shared/design';
 *
 * const cardPrimaryProps = applyPreset('cardPrimary');
 * const cardSecondaryProps = applyPreset('cardSecondary');
 * const cardMutedProps = applyPreset('cardMuted');
 *
 * const buttonPrimaryProps = applyPreset('buttonPrimary');
 * const buttonSecondaryProps = applyPreset('buttonSecondary');
 * const buttonDangerProps = applyPreset('buttonDanger');
 *
 * const panelDefaultProps = applyPreset('panelDefault');
 * const panelMinimalProps = applyPreset('panelMinimal');
 *
 * const tableDefaultProps = applyPreset('tableDefault');
 * const tableStripedProps = applyPreset('tableStriped');
 * const tableBorderedProps = applyPreset('tableBordered');
 */

// ───────────────────────────────────────────────────────────────────────────
// COMPOUND VARIANTS (Advanced!)
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// COMPOUND VARIANTS (Advanced!)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Pre-configured combinations for complex UI patterns:
 *
 * import { COMPOUND_VARIANTS } from '@/shared/design';
 *
 * // Pro Card: Elevated + Gradient + Large padding
 * <Card {...COMPOUND_VARIANTS.proCard}>
 *   Professional Grade Content
 * </Card>
 *
 * // Featured Card: Glass effect + Extra shadow + Interactive
 * <Card {...COMPOUND_VARIANTS.featuredCard}>
 *   Featured Content
 * </Card>
 *
 * // CTA Button: Big gradient with hover effect
 * <Button {...COMPOUND_VARIANTS.ctaButton}>
 *   Complete Your Action
 * </Button>
 *
 * // Urgent Button: Danger with emphasis
 * <Button {...COMPOUND_VARIANTS.urgentButton}>
 *   Immediate Action Required
 * </Button>
 */

// ───────────────────────────────────────────────────────────────────────────
// REAL-WORLD PATTERNS
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// REAL-WORLD PATTERNS
// ───────────────────────────────────────────────────────────────────────────

/**
 * Complete real-world component patterns:
 *
 * // Form Card
 * <Card variant="solid" padding="lg" shadow="md">
 *   Form content here
 * </Card>
 *
 * // Feature List
 * <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
 *   <Card variant="gradient" padding="md" shadow="sm">Feature 1</Card>
 *   <Card variant="gradient" padding="md" shadow="sm">Feature 2</Card>
 *   <Card variant="gradient" padding="md" shadow="sm">Feature 3</Card>
 * </div>
 *
 * // Action Panel
 * <Panel variant="solid" collapsible>
 *   <Button variant="gradient" size="lg" fullWidth>Main Action</Button>
 *   <Button variant="ghost" size="lg" fullWidth>Alternative</Button>
 * </Panel>
 *
 * // Data Table Section
 * <Panel variant="minimal">
 *   <Table variant="striped" {...props} />
 * </Panel>
 */

// ───────────────────────────────────────────────────────────────────────────
// MIGRATION GUIDE
// ───────────────────────────────────────────────────────────────────────────

/**
 * Converting from old hardcoded Tailwind to new variant system:
 *
 * OLD:
 *   <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
 *     <h2 className="text-xl font-bold text-gray-900">Title</h2>
 *     <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
 *       Action
 *     </button>
 *   </div>
 *
 * NEW:
 *   <Card variant="solid" padding="lg" shadow="lg">
 *     <h2>Title</h2>
 *     <Button variant="primary">Action</Button>
 *   </Card>
 *
 * BENEFITS:
 *   ✓ Consistent styling across app
 *   ✓ Theme switching works automatically
 *   ✓ Smaller code, more maintainable
 *   ✓ Premium feel guaranteed
 *   ✓ Scoped overrides possible
 */

// ───────────────────────────────────────────────────────────────────────────
// PHASE 3 COMPLETE COMMAND REFERENCE
// ───────────────────────────────────────────────────────────────────────────

/**
 * CARD VARIANTS:
 *   - solid (default)
 *   - outline (minimal)
 *   - glass (modern)
 *   - gradient (premium)
 *   - elevated (emphasis)
 *
 * BUTTON VARIANTS:
 *   - primary (main action)
 *   - secondary (alternative)
 *   - ghost (minimal)
 *   - danger (destructive)
 *   - success (confirm)
 *   - warning (alert)
 *   - gradient (CTA)
 *
 * PANEL VARIANTS:
 *   - solid (default)
 *   - outline (minimal)
 *   - glass (modern)
 *   - minimal (ultra-minimal)
 *
 * TABLE VARIANTS:
 *   - minimal (data-focused)
 *   - striped (readable)
 *   - bordered (structured)
 *   - hover (interactive)
 *
 * USAGE:
 *   import { Card, Button, Panel, Table } from '@/shared/components';
 *   import { PRESET_COMBOS, COMPOUND_VARIANTS } from '@/shared/design';
 *
 *   <Card variant="solid" padding="lg" shadow="md" />
 *   <Button variant="primary" size="md" />
 *   <Panel {...PRESET_COMBOS.panelDefault} />
 *   <Button {...COMPOUND_VARIANTS.ctaButton} />
 */

