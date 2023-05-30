import * as React from "react";
import {
    Card,
    CardHeader,
    CardContent,
    Divider,
    TextField
} from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";

const validationSchemaJurisdiction = yup.object().shape({
    jurisdiction: yup.string().required("Required"),
    connection: yup.string().required("Required"),
});


const Jurisdiction = (props: any) => {
    const connectionType = ["Test", "Production"];

    // const jurisdictionFormik = useFormik({
    //   initialValues: {
    //     jurisdiction: "",
    //     connection: "",
    //   },
    //   validationSchema: validationSchemaJurisdiction,
    //   onSubmit: (values) => {
    //     console.log(values);
    //     // mutateFunction({ variables: { type: input.value } });
    //     jurisdictionFormik.setSubmitting(false);
    //   },
    // });

    return (
        <>
            <Card sx={{ minWidth: 275, borderRadius: "0px 0px 30px 30px" }}>
                <CardHeader title="Review the Jurisdiction to get started" />
                <Divider />
                <CardContent>
                    <div>
                        Within this section, you can review the Jurisdiction of your selected connection. It's important to make sure that the Jurisdiction is correct, as any changes made will impact the selected connection.
                    </div>
                    <TextField
                        id="jurisdiction"
                        label="Jurisdiction"
                        variant="filled"
                        fullWidth
                        disabled
                        defaultValue={props.destinationById.jurisdiction.description}
                        InputProps={{
                            readOnly: true,
                        }}
                        sx={{ marginTop: 1 }}
                    />
                </CardContent>
            </Card>
            <Card sx={{ minWidth: 275, marginTop: 5, borderRadius: "0px 0px 30px 30px" }}>
                <CardHeader title="Review the type of connection" />
                <Divider />
                <CardContent>
                    <div>
                        Within this section, you can review the type of connection you have, such as production or test
                    </div>
                    <TextField
                        id="connectionType"
                        label="Type Of Connection"
                        variant="filled"
                        fullWidth
                        disabled
                        defaultValue={props.destinationById.dest_type.type}
                        InputProps={{
                            readOnly: true,
                        }}
                        sx={{ marginTop: 1 }}
                    />
                </CardContent>
            </Card>
        </>
        // <div>
        //   <Typography variant="h2">
        //     Select a Jurisdiction to get started
        //   </Typography>
        //   <Divider />
        //   <Autocomplete
        //     id="jurisdiction"
        //     options={jurisdictions}
        //     sx={{ width: 300 }}
        //     value={jurisdictionFormik.values.jurisdiction}
        //     onChange={(event, data) => {
        //       jurisdictionFormik.setFieldValue("jurisdiction", data);
        //     }}
        //     renderInput={(params) => (
        //       <TextField
        //         required
        //         {...params}
        //         label="Start typing & select from the list..."
        //       />
        //     )}
        //   />
        //   <Typography variant="h3">Select a type of a connection</Typography>
        //   <Divider />
        //   <Autocomplete
        //     id="connection"
        //     options={connectionType}
        //     sx={{ width: 300, marginTop: 5 }}
        //     value={jurisdictionFormik.values.connection}
        //     onChange={(event, data) => {
        //       jurisdictionFormik.setFieldValue("connection", data);
        //     }}
        //     renderInput={(params) => (
        //       <TextField required {...params} label="Select from the list..." />
        //     )}
        //   />
        // </div>
    );
    // }
};

export default Jurisdiction;