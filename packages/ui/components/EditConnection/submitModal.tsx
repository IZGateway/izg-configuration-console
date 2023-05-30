import * as React from "react";
import { Typography, Box, Button, Modal } from "@mui/material";

const SubmitModal = () => {
  const [open, setOpen] = React.useState(false);
  const handleClose = () => {
    setOpen(true);
  };
  const handleOpen = () => {
    setOpen(true);
  };

  return (
    <div>
      <Button
        variant="contained"
        size="large"
        onClick={handleOpen}
        sx={{
          background: "primary",
          borderRadius: "37.5px",
          margin: "1em",
          alignItems: "center",
        }}
      >
        SUBMIT
      </Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={{
            position: "absolute" as "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            border: "2px solid #000",
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Thanks for submission! Our team needs to review now
          </Typography>
          <Typography id="modal-modal-description" sx={{ mt: 2 }}>
            Duis vitae turpis nunc. Ut facilisis, odio vel volutpat mollis,
            libero quam ultrices purus, quis consequat magna turpis ut tortor.
            Fusce fringilla bibendum Duis vitae turpis nunc. Ut facilisis, odio
            vel volutpat mollis, libero quam ultrices purus, quis consequat
            magna turpis ut tortor. Fusce fringilla bibendum Duis vitae turpis
            nunc.
          </Typography>
          <Button
            variant="contained"
            size="large"
            href="/manage"
            sx={{
              background: "primary",
              borderRadius: "37.5px",
              margin: "1em",
              alignItems: "center",
            }}
          >
            MANAGE CONNECTIONS
          </Button>
        </Box>
      </Modal>
    </div>
  );
};

export default SubmitModal;
