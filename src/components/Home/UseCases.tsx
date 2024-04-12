import React, { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
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
        <DialogTitle>Use Cases</DialogTitle>
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
                    Example: A federal agency (e.g., Veterans Health
                    Association) or multi-jurisdictional vaccine provider
                    exchanges immunization data with the Mississippi IIS through
                    the IZ Gateway.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography>
                    Exchanging data with providers helps IIS have data from more
                    providers, which enhances the completeness of IIS data.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    Enabling a connection between IISs and vaccine providers
                    improves the provider access to immunization data, allowing
                    them to make informed decisions about clinical care.
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
                    Example: Washington and New Mexico exchange immunization
                    data from their IIS through the IZ Gateway for a citizen who
                    moves between states.
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
                    Example: New Jersey exchanges immunization data from their
                    IIS with a patient portal (e.g., Docket or MyChart) through
                    the IZ Gateway.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography>
                    Patients have access to complete and accurate immunization
                    records for proof of vaccination and vaccination schedule
                    adherence.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    Jurisdictions respond to fewer vaccination record requests
                    via phone call and email.
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
                    Example: New York shares immunization data from their IIS
                    with CDC through the IZ Gateway to improve CDC’s awareness
                    of vaccination rates in New York.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography>
                    Jurisdictions send de-identified immunization data to CDC
                    via the IZ Gateway routing service so CDC can assess
                    nationwide coverage of flu and routine vaccinations.
                  </Typography>
                </ListItem>
                <Divider sx={{ marginY: 1 }} />
                <ListItem>
                  <Typography gutterBottom>
                    Using the IZ Gateway for data sharing with CDC allows
                    jurisdictions to replace the manual process of submitting
                    routine and flu data via secure file transfer protocol
                    (SFTP) with a partially of fully automated process.
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
