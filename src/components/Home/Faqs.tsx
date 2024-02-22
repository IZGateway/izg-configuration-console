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
} from '@mui/material'
import palette from '../../styles/theme/palette'

const customPaperStyles = {
  borderRadius: '0px 0px 30px 30px',
  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  paddingBottom: '16px',
}

const Faq = () => {
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
        Get Answers
      </Button>
      <Dialog
        PaperProps={{
          style: customPaperStyles,
        }}
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>Frequently Asked Questions</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            We've compiled answers to some of the most common questions our
            customers have. Please select a given question to expand the answer.
            If you don't find what you're looking for, feel free to reach out to
            our support team for further assistance.
          </Typography>
          <Divider sx={{ mt: 2, mb: 2 }} />
          <Accordion
            expanded={expandedAccordion === 'panel1'}
            onChange={handleChange('panel1')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel1a-content"
              id="panel1a-header"
            >
              <Typography variant="body1">
                <strong>What is the Configuration Console?</strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                The Configuration Console is a configuration service designed
                for organizations utilizing the IZ Gateway for immunization data
                exchange. It facilitates the seamless updating and testing of
                critical system configurations, ensuring the accuracy of
                parameters such as Endpoint URL, Endpoint ID, Username and
                Password, and MSH segment and FacilityID values used in HL7
                messages
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expandedAccordion === 'panel2'}
            onChange={handleChange('panel2')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel2a-content"
              id="panel2a-header"
            >
              <Typography variant="body1">
                <strong>
                  What are the key features of the Configuration Console?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                The key features include Endpoint configuration management, a
                dedicated testing mechanism, HL7 message customization, secure
                user authentication, and robust audit trail and versioning
                mechanisms.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            expanded={expandedAccordion === 'panel3'}
            onChange={handleChange('panel3')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel3a-content"
              id="panel3a-header"
            >
              <Typography variant="body1">
                <strong>
                  What organization system settings can be managed within the
                  Configuration Console?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                The Configuration Console allows the management of Endpoint URL,
                Endpoint ID, Username, Password, MSH, and FacilityID values
                crucial for immunization data exchange.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            expanded={expandedAccordion === 'panel4'}
            onChange={handleChange('panel4')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel4a-content"
              id="panel4a-header"
            >
              <Typography variant="body1">
                <strong>
                  How does the Configuration Console support testing?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                It provides a dedicated testing environment where users can
                validate configurations before deploying them to the production
                environment, minimizing the risk of errors.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            expanded={expandedAccordion === 'panel5'}
            onChange={handleChange('panel5')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel5a-content"
              id="panel5a-header"
            >
              <Typography variant="body1">
                <strong>
                  Can HL7 messages be customized using the Configuration
                  Console?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Yes, the Configuration Console allows users to customize HL7
                messages by modifying MSH and FacilityID values, ensuring
                compatibility with varied system requirements
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            expanded={expandedAccordion === 'panel6'}
            onChange={handleChange('panel6')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel6a-content"
              id="panel6a-header"
            >
              <Typography variant="body1">
                <strong>
                  How does the Configuration Console ensure security?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                It implements secure mechanisms for updating sensitive
                information such as usernames and passwords. User authentication
                details are handled with utmost confidentiality, adhering to
                industry security standards.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            expanded={expandedAccordion === 'panel7'}
            onChange={handleChange('panel7')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel7a-content"
              id="panel7a-header"
            >
              <Typography variant="body1">
                <strong>
                  Is there a mechanism to track configuration changes?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Yes, the Configuration Console maintains an audit trail of
                configuration changes, providing traceability and
                accountability. It also supports versioning to track different
                configurations over time.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            expanded={expandedAccordion === 'panel8'}
            onChange={handleChange('panel8')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel8a-content"
              id="panel8a-header"
            >
              <Typography variant="body1">
                <strong>
                  What is the scope of the Configuration Console project?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                The project scope includes configuration management, a testing
                environment, HL7 message customization, secure user
                authentication, and audit trail and versioning features. It
                excludes production deployment processes, IZ Gateway
                development, and support for data exchange protocols beyond HL7.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            expanded={expandedAccordion === 'panel9'}
            onChange={handleChange('panel9')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel9a-content"
              id="panel9a-header"
            >
              <Typography variant="body1">
                <strong>
                  Who are the primary users of the Configuration Console?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                The primary end users are Immunization Information System
                program and technical staff responsible for updating and testing
                configurations. Stakeholders are healthcare organizations
                relying on the IZ Gateway for comprehensive immunization
                records.
              </Typography>
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

export default Faq
