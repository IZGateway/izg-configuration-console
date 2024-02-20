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
        Learn More
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
            <strong>Welcome!</strong>{' '}
          </Typography>
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
              <Typography variant="h6">1. How can I place an order?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                To place an order, simply browse through our products, select
                the items you'd like to purchase, and proceed to checkout.
                Follow the prompts to enter your shipping and payment
                information, and you're all set!
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
              <Typography variant="h6">
                2. What payment methods do you accept?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                We accept various payment methods, including credit/debit cards,
                PayPal, and other secure online payment options. Rest assured
                that your payment information is encrypted and protected.
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
