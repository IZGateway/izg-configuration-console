import React, { useState } from 'react'
import { ArrowForward, ExpandMore } from '@mui/icons-material'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Typography,
  Divider,
  IconButton,
  List,
  Dialog,
  DialogTitle,
  DialogContent,
  ListItem,
} from '@mui/material'
import Close from '@mui/icons-material/Close'

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
        <DialogTitle>
          Frequently Asked Questions{' '}
          <IconButton
            onClick={handleClose}
            sx={{ float: 'right', color: 'grey' }}
          >
            <Close sx={{ float: 'right', color: 'grey' }} />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Typography gutterBottom>
            We&apos;ve compiled answers to some of the most common questions our
            customers have. Please select a given question to expand the answer.
            If you don&apos;t find what you&apos;re looking for, feel free to
            reach out to our support team for further assistance.
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
                The Configuration Console serves as an intuitive end-user
                interface, streamlining essential functions crucial for
                supporting the IZ Gateway. It replaces cumbersome manual
                processes, offering users a more efficient and user-friendly
                approach to IZ Gateway configuration management.
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
                  Who are the primary users of the Configuration Console?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                The primary end users are Immunization Information System (IIS),
                federal provider, and non-governmental healthcare organization
                program and technical staff responsible for updating and testing
                configurations through the IZ Gateway.
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
                  What are the key features of the Configuration Console?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography gutterBottom>
                The key features of the Configuration Console include the
                following:
              </Typography>
              <List>
                <ListItem>
                  <Typography gutterBottom variant="body2">
                    <strong>Username and Password Updates:</strong> End users
                    can conveniently submit username updates and comply with the
                    annual password changes required by the IZ Gateway’s
                    password policy.
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography gutterBottom variant="body2">
                    <strong>Endpoint Configuration Management:</strong>{' '}
                    Facilitates changes to the endpoint URL or the version of
                    the WSDL in use (CDC or IZGW), as well as managing endpoint
                    certificates.
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography gutterBottom variant="body2">
                    <strong>Dedicated Testing:</strong> Connectivity Testing:
                    Verifies connectivity and provides diagnostic support in
                    case of any connectivity issues. Diagnostic Testing:
                    Identifies operational configurations, including DNS, TCP,
                    TLS Version, Encryption, Certificates, SOAP service, and
                    username/password, and flags any corrections needed.
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography gutterBottom variant="body2">
                    <strong>HL7 Message Customization:</strong> Allows for the
                    customization of MSH and RXA values, and facilityId for
                    testing or transmitting messages to the endpoint.
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography gutterBottom variant="body2">
                    <strong>Secure User Authentication:</strong> Enables
                    authorized users to log in, with support for two-factor
                    authentication, and offers access controls for the
                    Configuration Console.
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography gutterBottom variant="body2">
                    <strong> Audit and Version Tracking:</strong> Provides
                    auditing capabilities, allowing users to track changes made
                    to the endpoint configuration over time.
                  </Typography>
                </ListItem>
              </List>
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
                  How does the Configuration Console support testing?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                The Configuration Console provides a dedicated testing
                environment where users can validate configurations before
                deploying them to the production environment, minimizing the
                risk of errors.
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
                  Can HL7 messages be customized using the Configuration
                  Console?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Yes, the Configuration Console allows users to customize HL7
                messages by modifying MSH and FacilityID values, ensuring
                compatibility with varied system requirements.
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
                  How does the Configuration Console ensure security?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                The Configuration Console provides a secure mechanism for
                updating sensitive information such as usernames and passwords.
                User authentication details are handled with utmost
                confidentiality, adhering to industry security standards.
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
            expanded={expandedAccordion === 'panel10'}
            onChange={handleChange('panel10')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel10a-content"
              id="panel10a-header"
            >
              <Typography variant="body1">
                <strong>
                  How will ongoing support and maintenance be handled?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Continuous support and maintenance for the Configuration Console
                will be managed through regular bi-monthly maintenance releases,
                which will incorporate user feedback to address any issues and
                introduce enhancements.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            expanded={expandedAccordion === 'panel11'}
            onChange={handleChange('panel11')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel11a-content"
              id="panel11a-header"
            >
              <Typography variant="body1">
                <strong>
                  Where can I find more information about the Configuration
                  Console project?
                </strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                For more questions, email{' '}
                <a href="mailto:IZGateway@cdc.gov">IZGateway@cdc.gov</a>
              </Typography>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Faq
