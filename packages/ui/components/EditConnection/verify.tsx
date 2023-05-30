import * as React from "react";
import {
    Card,
    CardHeader,
    CardContent,
    Container,
    Box,
    RadioGroup,
    Radio,
    Typography,
    Divider,
    FormControlLabel,
    FormControl,
    Button,
} from "@mui/material";


const Verify = (props: any) => {
    return (
        <div>
            <Card sx={{ minWidth: 275, borderRadius: "0px 0px 30px 30px" }}>
                <CardHeader title="Submit Changes" />
                <Divider />
                <CardContent>
                    <div>
                        Before you submit your edits, it's important to double-check that you've made all the changes you intended to make. Once you hit the "submit" button, your changes will be saved and it may not be possible to undo them. Take a moment to review your edits and make sure they accurately reflect your intended changes. If you're unsure about any of the edits, you may want to consult with a colleague or supervisor before submitting them. Remember, the changes you make can have a significant impact on the content, so it's essential to ensure that they are correct and appropriate. Thank you for taking the time to review your edits before submitting.
                    </div>

                </CardContent>
            </Card>
        </div>
    );
};

export default Verify;