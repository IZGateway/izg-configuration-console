import React, { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { ArrowForward, ExpandMore } from '@mui/icons-material'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Typography,
  Divider,
  List,
  ListItem,
} from '@mui/material'
import Link from 'next/link'

const customPaperStyles = {
  borderRadius: '0px 0px 30px 30px',
  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  paddingBottom: '16px',
}

const SupportingDocumentation = () => {
  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const [expandedAccordion, setExpandedAccordion] = useState(null)

  const handleChange = (panel) => (event, isExpanded) => {
    setExpandedAccordion(isExpanded ? panel : null)
  }
  return (
    <div>
      <Button
        variant="outlined"
        color="primary"
        size="small"
        onClick={handleClickOpen}
        endIcon={<ArrowForward />}
      >
        View Documentation
      </Button>
      <Dialog
        PaperProps={{
          style: customPaperStyles,
        }}
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>Supporting Documentation</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Access documentation now to streamline your operations and improve
            public health outcomes.
          </Typography>
          <Divider sx={{ mt: 2, mb: 2 }} />
          <Accordion
            expanded={expandedAccordion === 'panel1'}
            onChange={handleChange('panel1')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore color="primary" />}
              aria-controls="panel1a-content"
              id="panel1a-header"
            >
              <Typography variant="h6">
                IZG IIS-CDC Reporting (Automate Data Submissions)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <Typography>
                    The IZG IIS-CDC Reporting system automates data submissions
                    from Immunization Information Systems (IIS) to the Centers
                    for Disease Control and Prevention (CDC), streamlining
                    reporting processes.{' '}
                    <Link
                      href={
                        'https://cdcpartners.sharepoint.com/:f:/r/sites/NCIRD/PAP/IIS/IZ%20Gateway/IZG%20IIS-CDC%20Reporting%20(Automate%20Data%20Submissions)?csf=1&web=1&e=wZbFmh'
                      }
                    >
                      Access documentation
                    </Link>
                  </Typography>
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expandedAccordion === 'panel2'}
            onChange={handleChange('panel2')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore color="primary" />}
              aria-controls="panel2a-content"
              id="panel2a-header"
            >
              <Typography variant="h6">IZG IIS-to-IIS Data Exchange</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <Typography>
                    The IZG IIS-to-IIS Data Exchange facilitates secure and
                    standardized transmission of immunization data among
                    different Immunization Information Systems (IIS), promoting
                    interoperability.{' '}
                    <Link
                      href={
                        'https://cdcpartners.sharepoint.com/:f:/r/sites/NCIRD/PAP/IIS/IZ%20Gateway/IZG%20IIS-to-IIS%20Data%20Exchange?csf=1&web=1&e=5UcDZG'
                      }
                    >
                      Access documentation
                    </Link>
                  </Typography>
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
          <Accordion
            expanded={expandedAccordion === 'panel3'}
            onChange={handleChange('panel3')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore color="primary" />}
              aria-controls="panel3a-content"
              id="panel3a-header"
            >
              <Typography variant="h6">
                IZG Provider-to-IIS Data Exchange
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <Typography>
                    The IZG Provider-to-IIS Data Exchange enables healthcare
                    providers to submit immunization data directly to
                    Immunization Information Systems (IIS), enhancing public
                    health surveillance.{' '}
                    <Link
                      href={
                        'https://cdcpartners.sharepoint.com/:f:/r/sites/NCIRD/PAP/IIS/IZ%20Gateway/IZG%20Provider-to-IIS%20Data%20Exchange?csf=1&web=1&e=Wid5UA'
                      }
                    >
                      Access documentation
                    </Link>
                  </Typography>
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions sx={{ mr: 1 }}>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default SupportingDocumentation
