import React, { useEffect, useState } from "react";
import {
  TextField,
  Button,
  Box,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel
} from "@material-ui/core";
import { toast } from "react-toastify";

const problemTypes = ["TextBox", "Code", "MultipleChoice", "DragDrop", "FillBlanks"];
const answerTypes = ["string", "arithmetic", "numeric"];

export default function AddProblemForm({ courseNum, lessonId }) {
  const [loading, setLoading] = useState(true);

  const [courseName, setCourseName] = useState("");
  const [lessonName, setLessonName] = useState("");
  const [skills, setSkills] = useState([]);

  // form fields
  const [form, setForm] = useState({
    id: "",
    title: "",
    body: "",
    steps: [],
    images: []
  });

  /** -------------------------------
   *       GET skills + lesson info
   *  ------------------------------- */
  useEffect(() => {
    async function fetchSkills() {
      try {
        const res = await fetch(`http://localhost:4000/api/skills/${courseNum}/${lessonId}`);
        if (!res.ok) throw new Error("Failed to load skill metadata.");

        const data = await res.json();
        setCourseName(data.course);
        setLessonName(data.lesson);
        setSkills(data.skills || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        toast.error("Unable to load skills for this lesson.");
      }
    }

    fetchSkills();
  }, [courseNum, lessonId]);

  /** -------------------------------
   *      onBlur field updater
   *  ------------------------------- */
  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  /** --------------------------------
   *        Add new step
   *  -------------------------------- */
  const addStep = () => {
    setForm(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          skills: [],
          customSkill: "",
          stepAnswer: [""],
          problemType: "",
          stepTitle: "",
          stepBody: "",
          answerType: "",
          hints: []
        }
      ]
    }));
  };

  const updateStep = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.steps];
      updated[index][field] = value;
      return { ...prev, steps: updated };
    });
  };

  /** --------------------------------
   *        Add new hint to a step
   *  -------------------------------- */
  const addHint = (stepIndex, type) => {
    const newHint =
      type === "hint"
        ? {
            type: "hint",
            title: "",
            text: ""
          }
        : {
            type: "scaffold",
            problemType: "",
            answerType: "",
            hintAnswer: [""],
            title: "",
            text: ""
          };

    setForm(prev => {
      const updated = [...prev.steps];
      updated[stepIndex].hints.push(newHint);
      return { ...prev, steps: updated };
    });
  };

  const updateHint = (stepIndex, hintIndex, field, value) => {
    setForm(prev => {
      const updated = [...prev.steps];
      updated[stepIndex].hints[hintIndex][field] = value;
      return { ...prev, steps: updated };
    });
  };

  /** --------------------------------
   *        FILE UPLOAD handler
   *  -------------------------------- */
  const handleFileUpload = e => {
    const files = Array.from(e.target.files);
    setForm(prev => ({ ...prev, images: files }));
  };

  /** --------------------------------
   *        SUBMIT: POST multipart
   *  -------------------------------- */
  const submitForm = async e => {
    e.preventDefault();

    try {
      const fd = new FormData();
      fd.append("id", form.id);
      fd.append("title", form.title);
      fd.append("body", form.body);
      fd.append("lesson", lessonName);
      fd.append("courseName", courseName);

      for (const img of form.images) {
        fd.append("images", img);
      }

      fd.append("steps", JSON.stringify(form.steps));

      if (form.steps == "") {
        toast.error("Add at least one step.");
        return;
      }

      const res = await fetch("http://localhost:4000/api/problems", {
        method: "POST",
        body: fd
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add problem.");
        return;
      }

      toast.success(data.message || "Problem added!");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong.");
    }
  };

  if (loading) return <h3>Loading...</h3>;

  /** --------------------------------
   *       RENDER COMPONENT
   *  -------------------------------- */
  return (
    <Paper style={{ padding: 20 }}>
      <h2>
        Add new problem for Course <b>{courseName}</b>, Lesson <b>{lessonName}</b>
      </h2>

      <form onSubmit={submitForm}>

        {/* BASIC FIELDS --------------------------------------------------- */}
        <TextField
          required
          label="Problem ID"
          fullWidth
          onBlur={e => updateField("id", e.target.value)}
          defaultValue={form.id}
          margin="normal"
        />
        <TextField
          required
          label="Title"
          fullWidth
          onBlur={e => updateField("title", e.target.value)}
          defaultValue={form.title}
          margin="normal"
        />
        <TextField
          required
          label="Body"
          fullWidth
          multiline
          onBlur={e => updateField("body", e.target.value)}
          defaultValue={form.body}
          margin="normal"
        />

        {/* IMAGES ---------------------------------------------------------- */}
        <Box mt={2}>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
          />
        </Box>

        {/* STEPS ------------------------------------------------------------ */}
        <Box mt={3}>
          <Button variant="outlined" color="primary" onClick={addStep}>
            + Add Step
          </Button>
        </Box>

        {form.steps.map((step, i) => (
          <Paper key={i} style={{ padding: 15, marginTop: 20 }}>
            <h3>Step {i + 1}</h3>

            {/* Step Title */}
            <TextField
              required
              label="Step Title"
              fullWidth
              margin="normal"
              defaultValue={step.stepTitle}
              onBlur={e => updateStep(i, "stepTitle", e.target.value)}
            />

            {/* Step Body */}
            <TextField
              required
              label="Step Body"
              fullWidth
              margin="normal"
              multiline
              rows={2}
              defaultValue={step.stepBody}
              onBlur={e => updateStep(i, "stepBody", e.target.value)}
            />

            {/* EXISTING SKILLS SELECT */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Skills</InputLabel>
              <Select
                multiple
                value={step.skills}
                onChange={e => updateStep(i, "skills", e.target.value)}
              >
                {skills.map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* ADD CUSTOM SKILL */}
            <TextField
              label="Add Custom Skill"
              fullWidth
              margin="normal"
              defaultValue={step.customSkill}
              onBlur={e => updateStep(i, "customSkill", e.target.value)}
            />

            {/* Problem Type */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Problem Type</InputLabel>
              <Select
                value={step.problemType}
                onChange={e => updateStep(i, "problemType", e.target.value)}
              >
                {problemTypes.map(t => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Answer Type */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Answer Type</InputLabel>
              <Select
                value={step.answerType}
                onChange={e => updateStep(i, "answerType", e.target.value)}
              >
                {answerTypes.map(a => (
                  <MenuItem key={a} value={a}>{a}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Step Answer */}
            <TextField
              required
              label="Step Answer"
              fullWidth
              margin="normal"
              defaultValue={step.stepAnswer[0]}
              onBlur={e => updateStep(i, "stepAnswer", [e.target.value])}
            />

            {/* HINTS -------------------------------------------------------- */}
            <Box mt={2}>
              <Button
                variant="outlined"
                onClick={() => addHint(i, "hint")}
                style={{ marginRight: 10 }}
              >
                + Add Basic Hint
              </Button>

              <Button variant="outlined" onClick={() => addHint(i, "scaffold")}>
                + Add Scaffold Hint
              </Button>
            </Box>

            {/* Render hints */}
            {step.hints.map((hint, h) => (
              <Paper key={h} style={{ padding: 10, marginTop: 15 }}>
                <h4>Hint {h + 1} ({hint.type})</h4>

                <TextField
                  required
                  label="Title"
                  fullWidth
                  margin="normal"
                  defaultValue={hint.title}
                  onBlur={e => updateHint(i, h, "title", e.target.value)}
                />

                <TextField
                  required
                  label="Text"
                  fullWidth
                  margin="normal"
                  multiline
                  rows={2}
                  defaultValue={hint.text}
                  onBlur={e => updateHint(i, h, "text", e.target.value)}
                />

                {hint.type === "scaffold" && (
                  <>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Scaffold Problem Type</InputLabel>
                      <Select
                        value={hint.problemType}
                        onChange={e =>
                          updateHint(i, h, "problemType", e.target.value)
                        }
                      >
                        {problemTypes.map(t => (
                          <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth margin="normal">
                      <InputLabel>Answer Type</InputLabel>
                      <Select
                        value={hint.answerType}
                        onChange={e =>
                          updateHint(i, h, "answerType", e.target.value)
                        }
                      >
                        {answerTypes.map(a => (
                          <MenuItem key={a} value={a}>{a}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      required
                      label="Hint Answer"
                      fullWidth
                      margin="normal"
                      defaultValue={hint.hintAnswer[0]}
                      onBlur={e =>
                        updateHint(i, h, "hintAnswer", [e.target.value])
                      }
                    />
                  </>
                )}
              </Paper>
            ))}
          </Paper>
        ))}

        <Box mt={4}>
          <Button type="submit" color="primary" variant="contained">
            Submit Problem
          </Button>
        </Box>
      </form>
    </Paper>
  );
}
