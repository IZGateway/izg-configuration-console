import { alpha, type Theme } from '@mui/material/styles'
import type { SystemStyleObject } from '@mui/system'
import palette from '../../styles/theme/palette'

/**
 * IZG styling for Swagger UI on /api-doc, applied through `sx` on the box that
 * wraps <SwaggerUI>. Every selector is nested under that box, so the overrides
 * cannot reach any other page, and the extra class makes them outrank the
 * stock rules in swagger-ui.css, which stays the base.
 *
 * Written against swagger-ui-react 5.33. Swagger UI's class names are not a
 * public API: after an upgrade, check this page, because a renamed class makes
 * its override stop applying without any error.
 */

// The card shadow used by PageHeader and the other header cards.
const CARD_SHADOW = '0px 3px 5px rgba(0, 0, 0, 0.40)'

// One palette colour per HTTP method. Each carries white text at WCAG AA or
// better: primary 6.6:1, secondary 4.9:1, warningAccessible 5.0:1,
// primaryDark 13.5:1, error 6.9:1. (secondaryLight, 2.3:1, would fail.)
export const METHOD_COLOURS: Record<string, string> = {
  get: palette.primary,
  post: palette.secondary,
  put: palette.warningAccessible,
  patch: palette.primaryDark,
  delete: palette.error,
}

// The rules in swagger-ui.css that set `font-family: sans-serif` on text.
// Code, paths, types and schemas set monospace on their own rules and are
// deliberately left out, so they stay monospace.
const SANS_SERIF_SELECTORS = [
  '.swagger-ui',
  '.swagger-ui button',
  '.swagger-ui input',
  '.swagger-ui select',
  '.swagger-ui label',
  '.swagger-ui .btn',
  '.swagger-ui .tab li',
  '.swagger-ui section h3',
  '.swagger-ui .opblock-tag',
  '.swagger-ui .opblock-tag small',
  '.swagger-ui .opblock .opblock-summary-method',
  '.swagger-ui .opblock .opblock-summary-description',
  '.swagger-ui .opblock .opblock-section-header > label',
  '.swagger-ui .opblock .opblock-section-header h4',
  '.swagger-ui .opblock-description-wrapper',
  '.swagger-ui .opblock-description-wrapper p',
  '.swagger-ui .opblock-description-wrapper h4',
  '.swagger-ui .opblock-title_normal',
  '.swagger-ui .opblock-title_normal p',
  '.swagger-ui .opblock-title_normal h4',
  '.swagger-ui .responses-inner h4',
  '.swagger-ui .responses-inner h5',
  '.swagger-ui .response-col_status',
  '.swagger-ui .response-col_links',
  '.swagger-ui .parameter__name',
  '.swagger-ui table thead tr td',
  '.swagger-ui table thead tr th',
  '.swagger-ui section.models h4',
  '.swagger-ui section.models h5',
  '.swagger-ui .model-title',
  '.swagger-ui .info .title',
  '.swagger-ui .info h1',
  '.swagger-ui .info h2',
  '.swagger-ui .info h3',
  '.swagger-ui .info h4',
  '.swagger-ui .info p',
  '.swagger-ui .info li',
  '.swagger-ui .info a',
  '.swagger-ui .info table',
  '.swagger-ui .dialog-ux .modal-ux-header h3',
  '.swagger-ui .dialog-ux .modal-ux-content h4',
  '.swagger-ui .dialog-ux .modal-ux-content p',
]

const nested = (selectors: string[]) =>
  selectors.map((selector) => `& ${selector}`).join(', ')

const methodRules = (): SystemStyleObject<Theme> =>
  Object.fromEntries(
    Object.entries(METHOD_COLOURS).flatMap(([method, colour]) => [
      [
        `& .swagger-ui .opblock.opblock-${method}`,
        { borderColor: colour, backgroundColor: alpha(colour, 0.05) },
      ],
      [
        `& .swagger-ui .opblock.opblock-${method} .opblock-summary`,
        { borderColor: colour },
      ],
      [
        `& .swagger-ui .opblock.opblock-${method} .opblock-summary-method`,
        { backgroundColor: colour, color: palette.white },
      ],
      [
        `& .swagger-ui .opblock.opblock-${method} .tab-header .tab-item.active h4 span::after`,
        { backgroundColor: colour },
      ],
    ])
  )

const swaggerStyles = (theme: Theme): SystemStyleObject<Theme> => ({
  // The documentation sits in a white card, like the rest of the console's
  // page content.
  backgroundColor: palette.white,
  borderRadius: 1,
  boxShadow: CARD_SHADOW,
  px: { xs: 1, md: 3 },
  py: 1,

  [nested(SANS_SERIF_SELECTORS)]: {
    fontFamily: theme.typography.fontFamily,
  },
  '& .swagger-ui': { color: palette.greyDarkTypography },

  // Let the card set the width; Swagger UI's own wrapper adds a max-width and
  // side padding meant for a standalone page.
  '& .swagger-ui .wrapper': { maxWidth: 'none', padding: 0 },
  '& .swagger-ui .scheme-container': {
    boxShadow: 'none',
    padding: '16px 0',
    background: 'transparent',
  },

  // Info block: title, version badges and description.
  '& .swagger-ui .information-container .info': { margin: '24px 0' },
  '& .swagger-ui .info .title': {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: palette.primaryDark,
  },
  // Colours kept apart from the method badges (primary is GET, secondary is
  // POST) so the version badges don't read as endpoints. Both pass WCAG AA
  // with white text.
  '& .swagger-ui .info .title small': {
    backgroundColor: palette.activeDark,
    borderRadius: '50px',
  },
  '& .swagger-ui .info .title small.version-stamp': {
    backgroundColor: palette.greyText,
  },
  '& .swagger-ui .info .title small pre': {
    fontFamily: theme.typography.fontFamily,
  },
  '& .swagger-ui .info p, & .swagger-ui .info li': { fontSize: '0.875rem' },
  '& .swagger-ui a, & .swagger-ui .info a': { color: palette.primary },

  // Tag groups.
  '& .swagger-ui .opblock-tag': {
    fontWeight: 700,
    color: palette.greyDarkTypography,
    borderBottom: `1px solid ${palette.divider}`,
  },
  '& .swagger-ui .opblock-tag:hover': {
    backgroundColor: alpha(palette.primary, 0.04),
  },

  // Operations as flat, rounded rows: the method-coloured border marks each
  // one, so no elevation (this also drops Swagger's own faint shadow).
  '& .swagger-ui .opblock': {
    borderRadius: '8px',
    boxShadow: 'none',
    overflow: 'hidden',
  },
  // Smaller chevrons on group headings and endpoint rows (stock is 20px).
  '& .swagger-ui .expand-operation svg, & .swagger-ui .opblock-control-arrow svg':
    {
      width: '14px',
      height: '14px',
    },
  '& .swagger-ui .opblock .opblock-summary-method': {
    borderRadius: '50px',
    fontWeight: 700,
  },
  '& .swagger-ui .opblock .opblock-section-header': {
    backgroundColor: palette.white,
    boxShadow: 'none',
    borderBottom: `1px solid ${palette.divider}`,
  },
  ...methodRules(),

  // Buttons, matching MUI's outlined and contained buttons.
  '& .swagger-ui .btn': {
    borderRadius: '50px',
    border: `1px solid ${palette.primary}`,
    color: palette.primary,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.02857em',
  },
  '& .swagger-ui .btn:hover': {
    backgroundColor: alpha(palette.primary, 0.04),
    boxShadow: 'none',
  },
  '& .swagger-ui .btn.execute': {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
    color: palette.white,
  },
  '& .swagger-ui .btn.execute:hover': {
    backgroundColor: palette.primaryDark,
  },
  '& .swagger-ui .btn.cancel': {
    borderColor: palette.error,
    color: palette.error,
  },

  // Models section.
  '& .swagger-ui section.models': {
    border: `1px solid ${palette.divider}`,
    borderRadius: '8px',
  },
  '& .swagger-ui section.models h4': {
    fontWeight: 700,
    color: palette.greyDarkTypography,
  },
})

export default swaggerStyles
