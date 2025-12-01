import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    TextField,
    Button,
    Typography,
    Grid,
    MenuItem,
    Paper,
    FormControlLabel, 
    Checkbox
} from "@material-ui/core";
import { toast } from "react-toastify";

const AddLessonForm = ({ courseNum }) => {
    const [loading, setLoading] = useState(true);
    const [courseName, setCourseName] = useState("");
    const [allSkills, setAllSkills] = useState([]);

    // Form state
    const [lessonId, setLessonId] = useState("");
    const [lessonName, setLessonName] = useState("");
    const [lessonTopics, setLessonTopics] = useState("");
    const [allowRecycle, setAllowRecycle] = useState(false);


    const [learningObjectives, setLearningObjectives] = useState([
        { skill: "", threshold: "" }
    ]);

    // Fetch Skills + Course Name
    useEffect(() => {
        const loadSkills = async () => {
            try {
                const res = await axios.get(
                    `http://localhost:4000/api/skills/${courseNum}`
                );
                setCourseName(res.data.course);
                setAllSkills(res.data.skills);
            } catch (err) {
                console.error(err);
                toast.error(
                    err.response?.data?.error ||
                        "Failed to fetch skills from server."
                );
            } finally {
                setLoading(false);
            }
        };

        loadSkills();
    }, [courseNum]);

    // ========== Handle adding new LO row ==========
    const addLearningObjective = () => {
        setLearningObjectives([...learningObjectives, { skill: "", threshold: "" }]);
    };

    const removeLearningObjective = (index) => {
        const newLO = learningObjectives.filter((_, i) => i !== index);
        setLearningObjectives(newLO);
    };

    // ========== Handle LO change ==========
    const handleLOChange = (index, field, value) => {
        const updated = [...learningObjectives];
        updated[index][field] = value;
        setLearningObjectives(updated);
    };

    // ---------- Submit ----------
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Build learningObjectives object
        const LOobject = {};
        for (const item of learningObjectives) {
            if (!item.skill) {
                toast.error("Every learning objective must have a skill.");
                return;
            }
            if (item.threshold === "" || item.threshold < 0 || item.threshold > 1) {
                toast.error("Threshold must be a decimal between 0 and 1.");
                return;
            }
            LOobject[item.skill] = parseFloat(item.threshold);
        }

        const body = {
            courseNum: Number(courseNum),
            lesson: {
                id: lessonId,
                name: lessonName,
                topics: lessonTopics,
                allowRecycle: allowRecycle,
                learningObjectives: LOobject
            }
        };

        try {
            const res = await axios.post(
                "http://localhost:4000/api/lessons",
                body
            );
            toast.success(res.data.message || "Lesson added!");
        } catch (err) {
            console.error(err);
            toast.error(
                err.response?.data?.error ||
                    "Failed to add lesson."
            );
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <Paper style={{ padding: "20px", maxWidth: "650px", margin: "0 auto" }}>
            <Typography variant="h5" align="center" gutterBottom>
                Add New Lesson for Course: <strong>{courseName}</strong>
            </Typography>

            <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>

                    {/* Lesson ID */}
                    <Grid item xs={12}>
                        <TextField
                            label="Lesson ID"
                            variant="outlined"
                            fullWidth
                            required
                            value={lessonId}
                            onChange={(e) => setLessonId(e.target.value)}
                        />
                    </Grid>

                    {/* Lesson Name */}
                    <Grid item xs={12}>
                        <TextField
                            label="Lesson Name"
                            variant="outlined"
                            fullWidth
                            required
                            value={lessonName}
                            onChange={(e) => setLessonName(e.target.value)}
                        />
                    </Grid>

                    {/* Topics */}
                    <Grid item xs={12}>
                        <TextField
                            label="Lesson Topics"
                            variant="outlined"
                            fullWidth
                            value={lessonTopics}
                            onChange={(e) => setLessonTopics(e.target.value)}
                        />
                    </Grid>

                    {/* Allow recycle? */}
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={allowRecycle}
                                    onChange={(e) => setAllowRecycle(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Allow Recycle?"
                        />
                    </Grid>


                    {/* Learning Objectives */}
                    <Grid item xs={12}>
                        <Typography variant="h6">Learning Objectives</Typography>
                    </Grid>

                    {learningObjectives.map((lo, index) => (
                        <React.Fragment key={index}>
                            <Grid item xs={7}>
                                <TextField
                                    select
                                    label="Skill"
                                    variant="outlined"
                                    fullWidth
                                    value={lo.skill}
                                    onChange={(e) =>
                                        handleLOChange(index, "skill", e.target.value)
                                    }
                                >
                                    {allSkills.map((skill) => (
                                        <MenuItem key={skill} value={skill}>
                                            {skill}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={3}>
                                <TextField
                                    label="Threshold (0-1)"
                                    variant="outlined"
                                    fullWidth
                                    value={lo.threshold}
                                    onChange={(e) =>
                                        handleLOChange(index, "threshold", e.target.value)
                                    }
                                />
                            </Grid>

                            <Grid item xs={2}>
                                {learningObjectives.length > 1 && (
                                    <Button
                                        color="secondary"
                                        onClick={() => removeLearningObjective(index)}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </Grid>
                        </React.Fragment>
                    ))}

                    {/* Add more LO button */}
                    <Grid item xs={12}>
                        <Button variant="outlined" onClick={addLearningObjective}>
                            Add Another Learning Objective
                        </Button>
                    </Grid>

                    {/* Submit */}
                    <Grid item xs={12}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                        >
                            Submit Lesson
                        </Button>
                    </Grid>

                </Grid>
            </form>
        </Paper>
    );
};

export default AddLessonForm;
