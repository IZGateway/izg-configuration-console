import * as React from "react";
import {
    Card,
    CardHeader,
    CardContent,
    Divider,
    TextField
} from "@mui/material";


const Jurisdiction = (props: any) => {
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
    );
};

export default Jurisdiction;