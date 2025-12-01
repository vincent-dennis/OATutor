import React from "react";
import { TextField, Button, Grid } from "@material-ui/core";
import { toast } from "react-toastify";

class AddCourseForm extends React.Component {
    state = {
        courseName: "",
        courseOER: "",
        courseLicense: "",
        loading: false
    };

    handleChange = (e) => {
        this.setState({ [e.target.name]: e.target.value });
    };

    submitForm = async () => {
        const { courseName, courseOER, courseLicense } = this.state;

        if (!courseName.trim()) {
            toast.error("Course name is required!");
            return;
        }

        this.setState({ loading: true });

        try {
            const res = await fetch("http://localhost:4000/api/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseName,
                    courseOER,
                    courseLicense
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to add course.");
            } else {
                toast.success(data.message);
                // optional: navigate after success
                // this.props.history.push("/courses");
            }

        } catch (err) {
            toast.error("Network error.");
        }

        this.setState({ loading: false });
    };

    render() {
        return (
            <>
                <center><h2>Add new course</h2></center>

                <Grid container spacing={2} style={{ maxWidth: 500, margin: "0 auto", marginTop: 20 }}>

                    <Grid item xs={12}>
                        <TextField
                            label="Course Name"
                            name="courseName"
                            fullWidth
                            required
                            value={this.state.courseName}
                            onChange={this.handleChange}
                            variant="outlined"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            label="Course OER"
                            name="courseOER"
                            fullWidth
                            value={this.state.courseOER}
                            onChange={this.handleChange}
                            variant="outlined"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            label="Course License"
                            name="courseLicense"
                            fullWidth
                            value={this.state.courseLicense}
                            onChange={this.handleChange}
                            variant="outlined"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={this.submitForm}
                            disabled={this.state.loading}
                        >
                            {this.state.loading ? "Submitting..." : "Add Course"}
                        </Button>
                    </Grid>

                </Grid>
            </>
        );
    }
}

export default AddCourseForm;
