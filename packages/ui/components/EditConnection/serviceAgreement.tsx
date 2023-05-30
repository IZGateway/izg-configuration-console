import * as React from "react";
import {
  Card,
  CardHeader,
  CardContent,
  RadioGroup,
  Radio,
  Divider,
  FormControlLabel,
  FormControl,
} from "@mui/material";

interface PolicyProps {
  clickOnAgree: any;
}

const ServiceAgreement = (props: PolicyProps) => {
  return (

    <Card sx={{ minWidth: 275, borderRadius: "0px 0px 30px 30px" }}>
      <CardHeader title="Authorization Attestation" />
      <Divider />
      <CardContent>
        <div>
          Mauris in lacus quis leo vulputate laoreet id a mi. Fusce vitae
          molestie tellus. Sed ut velit dignissim, imperdiet felis ut, rhoncus
          orci. Integer tincidunt gravida interdum. Aenean quis sem non elit
          sagittis maximus id non arcu. Suspendisse semper, lorem lobortis
          iaculis rhoncus, lacus enim gravida purus, ac mattis magna nibh id
          elit. Phasellus id ultrices eros, tempus convallis enim. Aenean
          rutrum, mi id malesuada viverra, erat arcu laoreet odio, sit amet
          pretium sapien neque nec erat. Vestibulum at tortor rutrum ex
          scelerisque fringilla sit amet quis tortor. Ut eu tristique lorem, a
          tincidunt magna. Mauris volutpat ullamcorper massa, eget posuere
          purus pellentesque id. Nunc sed porttitor ex, ut maximus augue.
          Etiam risus est, fermentum non dictum nec, tempor nec tellus.
          Curabitur interdum nunc pellentesque mauris ultricies, vel ornare
          tortor cursus. Mauris et massa turpis. Nam eget sapien vitae magna
          mollis semper ut vel lorem. Aenean blandit molestie lorem, sed
          aliquet elit. Suspendisse efficitur dapibus faucibus.
        </div>
        <FormControl>
          <RadioGroup onChange={props.clickOnAgree}>
            <FormControlLabel
              value="agree"
              control={<Radio />}
              label="I Agree"
            />
          </RadioGroup>
        </FormControl>
      </CardContent>
    </Card>

  );
};

export default ServiceAgreement;
