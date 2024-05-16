import React, { useState } from 'react'
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
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import Link from 'next/link'
import Close from '@mui/icons-material/Close'
import palette from '../../styles/theme/palette'

const customPaperStyles = {
  borderRadius: '0px 0px 30px 30px',
  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  paddingBottom: '16px',
}
const documentationUrl =
  'https://cdcpartners.sharepoint.com/:f:/r/sites/NCIRD/PAP/IIS/IZ%20Gateway/'

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
        <DialogTitle>
          Supporting Documentation
          <IconButton
            onClick={handleClose}
            sx={{ float: 'right', color: 'grey' }}
          >
            <Close sx={{ float: 'right', color: 'grey' }} />
          </IconButton>
        </DialogTitle>
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
              <Typography variant="h6">Data sharing with CDC</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <Typography>
                    The Data sharing with CDC enables jurisdiction IISs to
                    submit record-level deidentified routine and aggregate flu
                    vaccination data to CDC.{' '}
                    <Link
                      href={`${documentationUrl}IZG%20IIS-CDC%20Reporting%20(Automate%20Data%20Submissions)?csf=1&web=1&e=wZbFmh`}
                      style={{ color: palette.primary }}
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
              <Typography variant="h6">Data exchange between IISs</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <Typography>
                    The Data exchange between IISs enables IIS to send and
                    receive immunization data to other IISs.{' '}
                    <Link
                      href={`${documentationUrl}IZG%20IIS-to-IIS%20Data%20Exchange?csf=1&web=1&e=5UcDZG`}
                      style={{ color: palette.primary }}
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
                Data exchange with vaccine providers
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <Typography>
                    The reporting and querying of immunization data to a
                    jurisdiction IIS by providers that serve more than
                    one-jurisdiction through the IZ Gateway.{' '}
                    <Link
                      href={`${documentationUrl}IZG%20Provider-to-IIS%20Data%20Exchange?csf=1&web=1&e=Wid5UA`}
                      style={{ color: palette.primary }}
                    >
                      Access documentation
                    </Link>
                  </Typography>
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SupportingDocumentation
