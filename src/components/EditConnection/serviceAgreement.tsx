/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  RadioGroup,
  Radio,
  Divider,
  FormControlLabel,
  FormControl,
  Typography,
} from '@mui/material'

interface PolicyProps {
  clickOnAgree: any
  agreed: boolean
}

const ServiceAgreement = (props: PolicyProps) => {
  return (
    <Card sx={{ minWidth: 200, borderRadius: '0px 0px 30px 30px' }}>
      <CardHeader
        title={
          <Typography component="h2" sx={{ fontWeight: 'bold' }} variant="h6">
            Authorization Attestation
          </Typography>
        }
      />
      <Divider />
      <CardContent>
        <Typography variant="body1" component="div">
          I hereby attest that I have been duly authorized by the organization
          to make changes to the Immunization (IZ) Gateway configuration for my
          organization. I understand the responsibility entrusted to me and
          acknowledge that any alterations made shall comply with all applicable
          laws, regulations, and policies governing system configurations within
          the organization. I affirm that I have undergone the necessary
          training and possess the technical competence required to carry out
          system configuration changes effectively and responsibly. I am aware
          of the potential risks associated with such modifications and commit
          to implementing appropriate safeguards to ensure the integrity,
          availability, and confidentiality of the system and its data.
          Furthermore, I understand that my authorization is subject to any
          limitations or conditions imposed by the organization, and I shall
          adhere to all established procedures and protocols governing IZ
          Gateway configuration changes for my organization. I will exercise due
          diligence in evaluating the impact of any modifications and seek
          necessary approvals before implementing them. I acknowledge that the
          IZ Gateway may monitor and audit the changes made to the system
          configuration as part of their oversight and compliance efforts. I
          will cooperate fully with any such audits and provide any requested
          information or documentation related to the changes made. I undertake
          to prioritize the security and stability of the system during the
          configuration process, taking into account the potential impact on
          users, data, and overall exchange. By clicking Accept below, I declare
          that the information attested is accurate to the best of my knowledge.
          I understand that any misrepresentation or violation of the
          organization’s or IZ Gateway&apos;s policies may result in the
          revocation of my authorization and potential legal consequences.
        </Typography>
        <FormControl>
          <RadioGroup onChange={props.clickOnAgree}>
            <FormControlLabel
              value="agree"
              control={<Radio checked={props.agreed} />}
              label="I Agree"
              data-testid="agree-button"
            />
          </RadioGroup>
        </FormControl>
      </CardContent>
    </Card>
  )
}

export default ServiceAgreement
