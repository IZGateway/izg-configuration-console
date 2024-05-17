import React, { useState } from 'react'
import { ArrowForward, ExpandMore } from '@mui/icons-material'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Typography,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  IconButton,
} from '@mui/material'

import Close from '@mui/icons-material/Close'

const customPaperStyles = {
  borderRadius: '0px 0px 30px 30px',
  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  paddingBottom: '16px',
}

const UseCases = () => {
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
        Learn More
      </Button>
      <Dialog
        PaperProps={{
          style: customPaperStyles,
        }}
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>
          Use Cases
          <IconButton
            onClick={handleClose}
            sx={{ float: 'right', color: 'grey' }}
          >
            <Close sx={{ float: 'right', color: 'grey' }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Explore various scenarios and applications where our
            products/services can be beneficial.
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
                Data exchange with vaccine providers
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <Typography>
                    Data exchange with vaccine providers is the reporting and
                    querying of immunization data to a jurisdiction IIS by
                    providers that serve more than one-jurisdiction through the
                    IZ Gateway.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography>
                    The IIS has vaccination records from a provider
                    organization, which enhances the completeness of the data in
                    the IIS and helps the IIS and public health agencies
                    understand who in their state is protected from disease.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    Health care providers can get patients’ vaccination records
                    from the IIS, even when patients received vaccine at another
                    provider, allowing providers to make informed decisions
                    about clinical care for more patients.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    Example: A nurse at a hospital system needs to understand
                    what vaccines their patient has received to determine the
                    best tests to run so they query the IIS. The nurse realizes
                    the patient is protected from flu but should consider an RSV
                    vaccine due to their age. The patient agrees to get the RSV
                    shot that day, and the hospital submits the record of
                    vaccination to the IIS.
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
              <Typography variant="h6">Data exchange between IISs </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <Typography>
                    Data exchange between IISs enables IIS to send and receive
                    immunization data to other IISs.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography>
                    This data exchange helps IIS data be complete and accurate
                    for the people living in the jurisdiction.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    At the point of care, providers can access complete and
                    accurate patient immunization history.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    Health departments can make informed plans to improve the
                    health of their communities
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    Example: A provider at the State B health dept. (who would
                    also be responsible for entering data into an IIS) would
                    need to query the State A IIS for the child&apos;s
                    immunization history to verify whether the child meets
                    immunization requirements for day care entry in State B.
                    Further immunization decisions can be made by State B health
                    department based on this information.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    Example: A family moves from state A to neighboring state B
                    while their child is 3 years old. State B identifies a need
                    for the child&apos;s immunization record and queries the
                    neighboring state&apos;s IIS via the IZ Gateway. In
                    response, state A sends the child&apos;s record. Now
                    providers in state B will have the child&apos;s full
                    immunization history to reference for decisions and will add
                    to the record in the IIS when the child receives additional
                    vaccines.
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
              <Typography variant="h6"> Data sharing with patients</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <Typography>
                    Data sharing with patients provides individuals with
                    electronic access to their immunization records through
                    querying an IIS using a consumer access portal.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography>
                    Patients have quick and easy access to complete and accurate
                    immunization records for proof of vaccination and to help
                    them adhere to vaccination schedules.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    Jurisdictions respond to fewer vaccination record requests
                    via phone call and email saving time and resources.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    Example: When the child goes to summer camp in state B,
                    their parent must provide immunization details. The parent
                    uses a smart phone application to access a consumer access
                    portal. The portal requests and receives the correct record
                    via the IZ Gateway and provides that record to the
                    parent&apos;s app for use.
                  </Typography>
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
          <Accordion
            expanded={expandedAccordion === 'panel4'}
            onChange={handleChange('panel4')}
          >
            <AccordionSummary
              expandIcon={<ExpandMore color="primary" />}
              aria-controls="panel4a-content"
              id="panel4a-header"
            >
              <Typography variant="h6">Data sharing with CDC</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <Typography>
                    Data sharing with CDC enables jurisdiction IISs to submit
                    record-level deidentified routine and aggregate flu
                    vaccination data to CDC.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography>
                    Jurisdictions can opt to automate sending the data to CDC
                    via the IZ Gateway routing service to streamline processes
                    and save time.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    CDC uses deidentified IIS data to assess vaccination
                    coverage of flu and routine vaccinations and inform public
                    health decisions.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    Using the IZ Gateway for data sharing with CDC aligns with
                    CDC&apos;s cloud-based, modernized data architecture
                    designed to address future public health emergencies.
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

export default UseCases
