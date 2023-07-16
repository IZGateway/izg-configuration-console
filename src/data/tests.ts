export const testResults = {
  destId: "ak",
  isSuccess: true,
  message: "test",
  testResults: [
    {
      name: "DNS CONNECTION TEST",
      order: 1,
      message: "",
      detail: { ADDRESS: "216.160.239.60", FAMILY: 4 },
      status: "PASS",
    },
    {
      name: "TCP CONNECTION TEST",
      order: 2,
      message: "this is error message",
      detail: "",
      status: "FAIL",
    },
    {
      name: "AUTHENTICATION TEST",
      order: 3,
      message: "THIS IS WARNING message",
      detail: "",
      status: "WARNING",
    },
    {
      name: "ABC TEST",
      order: 4,
      message: "",
      detail: "",
      status: "SKIPPED",
    },
    {
      name: "DEF TEST",
      order: 5,
      message: "",
      detail: "",
      status: "SKIPPED",
    },
  ],
  destUrl: "tester",
};
