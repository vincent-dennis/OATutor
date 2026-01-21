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
  FormControlLabel,
  Chip
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
   * GET skills + lesson info
   * ------------------------------- */
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
   * onBlur field updater
   * ------------------------------- */
  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  /** --------------------------------
   * Add new step
   * -------------------------------- */
  const addStep = () => {
    setForm(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          skills: [],
          customSkills: [], // Changed to array for multiple skills
          tempCustomSkill: "", // Temporary holder for input
          stepAnswer: [""],
          problemType: "",
          stepTitle: "",
          stepBody: "",
          answerType: "",
          hints: [],
          choices: []
        }
      ]
    }));
  };

  const updateStep = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.steps];

      if (field === "problemType") {
        updated[index][field] = value;

        // MODIFIED: choices required for MultipleChoice and DragDrop + initialize arrays
        if (
          (value === "MultipleChoice" || value === "DragDrop") &&
          (!Array.isArray(updated[index].choices) || updated[index].choices.length === 0)
        ) {
          updated[index].choices = [""];
        }

        // MODIFIED: DragDrop requires stepAnswer length === choices length
        if (value === "DragDrop") {
          const choicesLen = Array.isArray(updated[index].choices) ? updated[index].choices.length : 0;
          const ans = Array.isArray(updated[index].stepAnswer) ? [...updated[index].stepAnswer] : [];
          const targetLen = Math.max(choicesLen, 1);

          if (ans.length < targetLen) ans.push(...Array(targetLen - ans.length).fill(""));
          if (ans.length > targetLen) ans.splice(targetLen);

          updated[index].stepAnswer = ans.length ? ans : [""];
        }

        return { ...prev, steps: updated };
      }

      updated[index][field] = value;
      return { ...prev, steps: updated };
    });
  };

  // Helper: Add custom skill to step
  const addCustomSkill = (stepIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const val = updated[stepIndex].tempCustomSkill;
      if (val && val.trim() !== "") {
        updated[stepIndex].customSkills = [
          ...(updated[stepIndex].customSkills || []),
          val.trim()
        ];
        updated[stepIndex].tempCustomSkill = "";
      }
      return { ...prev, steps: updated };
    });
  };

  // Helper: Remove custom skill from step
  const deleteCustomSkill = (stepIndex, skillIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];
      updated[stepIndex].customSkills.splice(skillIndex, 1);
      return { ...prev, steps: updated };
    });
  };

  const addChoice = (stepIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const current = Array.isArray(updated[stepIndex].choices) ? [...updated[stepIndex].choices] : [];
      current.push("");
      updated[stepIndex].choices = current;

      // MODIFIED: DragDrop sync stepAnswer length with choices
      if (updated[stepIndex].problemType === "DragDrop") {
        const ans = Array.isArray(updated[stepIndex].stepAnswer) ? [...updated[stepIndex].stepAnswer] : [];
        ans.push("");
        updated[stepIndex].stepAnswer = ans;
      }

      return { ...prev, steps: updated };
    });
  };

  const updateChoice = (stepIndex, choiceIndex, value) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const current = Array.isArray(updated[stepIndex].choices) ? [...updated[stepIndex].choices] : [];
      current[choiceIndex] = value;
      updated[stepIndex].choices = current;
      return { ...prev, steps: updated };
    });
  };

  const deleteChoice = (stepIndex, choiceIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const current = Array.isArray(updated[stepIndex].choices) ? [...updated[stepIndex].choices] : [];
      current.splice(choiceIndex, 1);

      // MODIFIED: keep at least one row when MultipleChoice or DragDrop
      if (
        (updated[stepIndex].problemType === "MultipleChoice" || updated[stepIndex].problemType === "DragDrop") &&
        current.length === 0
      ) {
        updated[stepIndex].choices = [""];
      } else {
        updated[stepIndex].choices = current;
      }

      // MODIFIED: DragDrop sync stepAnswer length with choices (and keep at least one)
      if (updated[stepIndex].problemType === "DragDrop") {
        const ans = Array.isArray(updated[stepIndex].stepAnswer) ? [...updated[stepIndex].stepAnswer] : [];
        ans.splice(choiceIndex, 1);
        const targetLen = Array.isArray(updated[stepIndex].choices) ? updated[stepIndex].choices.length : 0;
        if (targetLen === 0) {
          updated[stepIndex].stepAnswer = [""];
        } else {
          while (ans.length < targetLen) ans.push("");
          if (ans.length > targetLen) ans.splice(targetLen);
          updated[stepIndex].stepAnswer = ans.length ? ans : [""];
        }
      }

      return { ...prev, steps: updated };
    });
  };

  // MODIFIED: stepAnswer helpers to allow multiple answers (non-DragDrop)
  const addStepAnswer = (stepIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const current = Array.isArray(updated[stepIndex].stepAnswer) ? [...updated[stepIndex].stepAnswer] : [];
      current.push("");
      updated[stepIndex].stepAnswer = current.length ? current : [""];
      return { ...prev, steps: updated };
    });
  };

  const updateStepAnswerAt = (stepIndex, answerIndex, value) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const current = Array.isArray(updated[stepIndex].stepAnswer) ? [...updated[stepIndex].stepAnswer] : [];
      current[answerIndex] = value;
      updated[stepIndex].stepAnswer = current.length ? current : [""];
      return { ...prev, steps: updated };
    });
  };

  const deleteStepAnswer = (stepIndex, answerIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const current = Array.isArray(updated[stepIndex].stepAnswer) ? [...updated[stepIndex].stepAnswer] : [];
      current.splice(answerIndex, 1);
      updated[stepIndex].stepAnswer = current.length ? current : [""];
      return { ...prev, steps: updated };
    });
  };

  /** --------------------------------
   * Add new hint to a step
   * -------------------------------- */
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
            choices: [], // MODIFIED: scaffold supports choices for MultipleChoice/DragDrop
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
      const hint = updated[stepIndex].hints[hintIndex];

      // MODIFIED: scaffold problemType change initializes choices + sync DragDrop answers
      if (hint.type === "scaffold" && field === "problemType") {
        hint[field] = value;

        if (
          (value === "MultipleChoice" || value === "DragDrop") &&
          (!Array.isArray(hint.choices) || hint.choices.length === 0)
        ) {
          hint.choices = [""];
        }

        if (value === "DragDrop") {
          const choicesLen = Array.isArray(hint.choices) ? hint.choices.length : 0;
          const ans = Array.isArray(hint.hintAnswer) ? [...hint.hintAnswer] : [];
          const targetLen = Math.max(choicesLen, 1);

          if (ans.length < targetLen) ans.push(...Array(targetLen - ans.length).fill(""));
          if (ans.length > targetLen) ans.splice(targetLen);

          hint.hintAnswer = ans.length ? ans : [""];
        }

        return { ...prev, steps: updated };
      }

      hint[field] = value;
      return { ...prev, steps: updated };
    });
  };

  // MODIFIED: scaffold choices helpers (MultipleChoice/DragDrop)
  const addHintChoice = (stepIndex, hintIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const hint = updated[stepIndex].hints[hintIndex];
      const current = Array.isArray(hint.choices) ? [...hint.choices] : [];
      current.push("");
      hint.choices = current.length ? current : [""];

      if (hint.problemType === "DragDrop") {
        const ans = Array.isArray(hint.hintAnswer) ? [...hint.hintAnswer] : [];
        ans.push("");
        hint.hintAnswer = ans.length ? ans : [""];
      }

      return { ...prev, steps: updated };
    });
  };

  const updateHintChoice = (stepIndex, hintIndex, choiceIndex, value) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const hint = updated[stepIndex].hints[hintIndex];
      const current = Array.isArray(hint.choices) ? [...hint.choices] : [];
      current[choiceIndex] = value;
      hint.choices = current;
      return { ...prev, steps: updated };
    });
  };

  const deleteHintChoice = (stepIndex, hintIndex, choiceIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const hint = updated[stepIndex].hints[hintIndex];
      const current = Array.isArray(hint.choices) ? [...hint.choices] : [];
      current.splice(choiceIndex, 1);

      if ((hint.problemType === "MultipleChoice" || hint.problemType === "DragDrop") && current.length === 0) {
        hint.choices = [""];
      } else {
        hint.choices = current;
      }

      if (hint.problemType === "DragDrop") {
        const ans = Array.isArray(hint.hintAnswer) ? [...hint.hintAnswer] : [];
        ans.splice(choiceIndex, 1);
        const targetLen = Array.isArray(hint.choices) ? hint.choices.length : 0;
        if (targetLen === 0) {
          hint.hintAnswer = [""];
        } else {
          while (ans.length < targetLen) ans.push("");
          if (ans.length > targetLen) ans.splice(targetLen);
          hint.hintAnswer = ans.length ? ans : [""];
        }
      }

      return { ...prev, steps: updated };
    });
  };

  // MODIFIED: scaffold hintAnswer helpers (allow multiple; non-DragDrop)
  const addHintAnswer = (stepIndex, hintIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const hint = updated[stepIndex].hints[hintIndex];
      const current = Array.isArray(hint.hintAnswer) ? [...hint.hintAnswer] : [];
      current.push("");
      hint.hintAnswer = current.length ? current : [""];
      return { ...prev, steps: updated };
    });
  };

  const updateHintAnswerAt = (stepIndex, hintIndex, answerIndex, value) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const hint = updated[stepIndex].hints[hintIndex];
      const current = Array.isArray(hint.hintAnswer) ? [...hint.hintAnswer] : [];
      current[answerIndex] = value;
      hint.hintAnswer = current.length ? current : [""];
      return { ...prev, steps: updated };
    });
  };

  const deleteHintAnswer = (stepIndex, hintIndex, answerIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const hint = updated[stepIndex].hints[hintIndex];
      const current = Array.isArray(hint.hintAnswer) ? [...hint.hintAnswer] : [];
      current.splice(answerIndex, 1);
      hint.hintAnswer = current.length ? current : [""];
      return { ...prev, steps: updated };
    });
  };

  /** --------------------------------
   * FILE UPLOAD handler
   * -------------------------------- */
  const handleFileUpload = e => {
    const files = Array.from(e.target.files);

    // Limit check: Max 5 files
    if (files.length > 5) {
        toast.error("You can only upload a maximum of 5 images.");
        e.target.value = ""; // Reset the input
        setForm(prev => ({ ...prev, images: [] }));
        return;
    }

    // Size check: Max 20MB total
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB in bytes

    if (totalSize > MAX_SIZE) {
        toast.error("Total file size exceeds the 20MB limit.");
        e.target.value = ""; // Reset the input
        setForm(prev => ({ ...prev, images: [] }));
        return;
    }

    setForm(prev => ({ ...prev, images: files }));
  };

  /** --------------------------------
   * SUBMIT: POST multipart
   * -------------------------------- */
  const submitForm = async e => {
    e.preventDefault();

    try {
      for (let i = 0; i < form.steps.length; i++) {
        const s = form.steps[i];

        // MODIFIED: choices required for MultipleChoice and DragDrop; DragDrop also enforces answer length
        if (s.problemType === "MultipleChoice" || s.problemType === "DragDrop") {
          const rawChoices = Array.isArray(s.choices) ? s.choices : (s.choices != null ? [s.choices] : []);
          const choicesTrimmed = rawChoices.map(c => (c == null ? "" : String(c)).trim());

          if (choicesTrimmed.filter(Boolean).length === 0) {
            toast.error(`Step ${i + 1} has problemType '${s.problemType}' but no choices given.`);
            return;
          }

          if (choicesTrimmed.some(c => !c)) {
            toast.error(`Step ${i + 1} has empty choice values.`);
            return;
          }

          if (s.problemType === "DragDrop") {
            const rawAns = Array.isArray(s.stepAnswer) ? s.stepAnswer : (s.stepAnswer != null ? [s.stepAnswer] : []);
            if (rawAns.length !== rawChoices.length) {
              toast.error(`Step ${i + 1} DragDrop requires stepAnswer length to match choices length.`);
              return;
            }
            const ansTrimmed = rawAns.map(a => (a == null ? "" : String(a)).trim());
            if (ansTrimmed.some(a => !a)) {
              toast.error(`Step ${i + 1} DragDrop has empty stepAnswer values.`);
              return;
            }
          }
        }

        // MODIFIED: validate scaffold hints with same rules
        for (let h = 0; h < (s.hints || []).length; h++) {
          const hint = s.hints[h];
          if (hint.type !== "scaffold") continue;

          if (hint.problemType === "MultipleChoice" || hint.problemType === "DragDrop") {
            const rawChoices = Array.isArray(hint.choices) ? hint.choices : (hint.choices != null ? [hint.choices] : []);
            const choicesTrimmed = rawChoices.map(c => (c == null ? "" : String(c)).trim());

            if (choicesTrimmed.filter(Boolean).length === 0) {
              toast.error(`Step ${i + 1}, Hint ${h + 1} has problemType '${hint.problemType}' but no choices given.`);
              return;
            }

            if (choicesTrimmed.some(c => !c)) {
              toast.error(`Step ${i + 1}, Hint ${h + 1} has empty choice values.`);
              return;
            }

            const rawAns = Array.isArray(hint.hintAnswer) ? hint.hintAnswer : (hint.hintAnswer != null ? [hint.hintAnswer] : []);
            const ansTrimmed = rawAns.map(a => (a == null ? "" : String(a)).trim());

            if (hint.problemType === "DragDrop") {
              if (rawAns.length !== rawChoices.length) {
                toast.error(`Step ${i + 1}, Hint ${h + 1} DragDrop requires hintAnswer length to match choices length.`);
                return;
              }
              if (ansTrimmed.some(a => !a)) {
                toast.error(`Step ${i + 1}, Hint ${h + 1} DragDrop has empty hintAnswer values.`);
                return;
              }
            } else {
              if (ansTrimmed.filter(Boolean).length === 0) {
                toast.error(`Step ${i + 1}, Hint ${h + 1} requires at least one hintAnswer.`);
                return;
              }
              if (ansTrimmed.some(a => !a)) {
                toast.error(`Step ${i + 1}, Hint ${h + 1} has empty hintAnswer values.`);
                return;
              }
            }
          } else {
            // scaffold non-choice types: allow multiple hint answers
            const rawAns = Array.isArray(hint.hintAnswer) ? hint.hintAnswer : (hint.hintAnswer != null ? [hint.hintAnswer] : []);
            const ansTrimmed = rawAns.map(a => (a == null ? "" : String(a)).trim());
            if (ansTrimmed.filter(Boolean).length === 0) {
              toast.error(`Step ${i + 1}, Hint ${h + 1} requires at least one hintAnswer.`);
              return;
            }
            if (ansTrimmed.some(a => !a)) {
              toast.error(`Step ${i + 1}, Hint ${h + 1} has empty hintAnswer values.`);
              return;
            }
          }
        }
      }

      const fd = new FormData();
      fd.append("id", form.id);
      fd.append("title", form.title);
      fd.append("body", form.body);
      fd.append("lesson", lessonName);
      fd.append("courseName", courseName);

      for (const img of form.images) {
        fd.append("images", img);
      }

      // Clean steps to remove temporary UI fields like tempCustomSkill
      // AND merge customSkills into the main skills array for the backend
      const cleanedSteps = form.steps.map(s => {
        const { tempCustomSkill, customSkills, skills, ...rest } = s;

        const mergedSkills = [...(skills || []), ...(customSkills || [])];

        // MODIFIED: normalize DragDrop stepAnswer length to choices length before submit
        if (rest.problemType === "DragDrop") {
          const ch = Array.isArray(rest.choices) ? rest.choices : (rest.choices != null ? [rest.choices] : []);
          const ans = Array.isArray(rest.stepAnswer) ? [...rest.stepAnswer] : (rest.stepAnswer != null ? [rest.stepAnswer] : []);
          while (ans.length < ch.length) ans.push("");
          if (ans.length > ch.length) ans.splice(ch.length);
          rest.stepAnswer = ans.length ? ans : [""];
        }

        return {
            ...rest,
            skills: mergedSkills
        };
      });

      fd.append("steps", JSON.stringify(cleanedSteps));

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
   * RENDER COMPONENT
   * -------------------------------- */
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
            <InputLabel shrink>Images (Max 5, Total 20MB). To include in problem body: ##[filename]</InputLabel>
            <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                style={{ marginTop: 8 }}
            />
            {/* Display uploaded file names */}
            <Box mt={1} display="flex" flexWrap="wrap">
                {form.images.map((file, i) => (
                    <Chip
                        key={i}
                        label={file.name}
                        variant="outlined"
                        style={{ margin: 4 }}
                    />
                ))}
            </Box>
        </Box>

        {/* STEPS ------------------------------------------------------------ */}
        <Box mt={3}>
          <Button variant="outlined" color="primary" onClick={addStep}>
            + Add Step
          </Button>
        </Box>

        {form.steps.map((step, i) => {
          const stepAnswers = Array.isArray(step.stepAnswer) ? step.stepAnswer : [step.stepAnswer]; // MODIFIED
          const isChoiceType = step.problemType === "MultipleChoice" || step.problemType === "DragDrop"; // MODIFIED
          const isDragDrop = step.problemType === "DragDrop"; // MODIFIED

          return (
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
              <Box display="flex" alignItems="center" mt={2}>
                <TextField
                  label="Add Custom Skill"
                  fullWidth
                  value={step.tempCustomSkill || ""}
                  onChange={e => updateStep(i, "tempCustomSkill", e.target.value)}
                  onKeyPress={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomSkill(i);
                    }
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => addCustomSkill(i)}
                  style={{ marginLeft: 10 }}
                >
                  Add
                </Button>
              </Box>

              {/* Display Added Custom Skills */}
              <Box mt={1} display="flex" flexWrap="wrap">
                {step.customSkills &&
                  step.customSkills.map((skill, sIdx) => (
                    <Chip
                      key={sIdx}
                      label={skill}
                      onDelete={() => deleteCustomSkill(i, sIdx)}
                      style={{ margin: 5 }}
                    />
                  ))}
              </Box>

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

              {/* MODIFIED: Choices inputs for MultipleChoice and DragDrop; DragDrop shows paired answers */}
              {isChoiceType && (
                <Box mt={2}>
                  <InputLabel shrink>Choices</InputLabel>

                  {(Array.isArray(step.choices) ? step.choices : [step.choices]).map((choice, cIdx) => (
                    <Box key={cIdx} display="flex" alignItems="center" mt={1}>
                      <TextField
                        required
                        label={`Choice ${cIdx + 1}`}
                        fullWidth
                        value={choice || ""}
                        onChange={e => updateChoice(i, cIdx, e.target.value)}
                      />

                      {isDragDrop && (
                        <TextField
                          required
                          label={`Answer ${cIdx + 1}`}
                          fullWidth
                          value={stepAnswers[cIdx] || ""}
                          onChange={e => updateStepAnswerAt(i, cIdx, e.target.value)}
                          style={{ marginLeft: 10 }}
                        />
                      )}

                      <Button
                        variant="outlined"
                        onClick={() => deleteChoice(i, cIdx)}
                        style={{ marginLeft: 10 }}
                        disabled={(Array.isArray(step.choices) ? step.choices.length : 1) <= 1}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))}

                  <Box mt={1}>
                    <Button variant="outlined" onClick={() => addChoice(i)}>
                      + Add Choice
                    </Button>
                  </Box>
                </Box>
              )}

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

              {/* MODIFIED: Multiple step answers (non-DragDrop) */}
              {!isDragDrop && (
                <Box mt={2}>
                  <InputLabel shrink>Step Answers</InputLabel>

                  {stepAnswers.map((ans, aIdx) => (
                    <Box key={aIdx} display="flex" alignItems="center" mt={1}>
                      <TextField
                        required
                        label={`Answer ${aIdx + 1}`}
                        fullWidth
                        value={ans || ""}
                        onChange={e => updateStepAnswerAt(i, aIdx, e.target.value)}
                      />
                      <Button
                        variant="outlined"
                        onClick={() => deleteStepAnswer(i, aIdx)}
                        style={{ marginLeft: 10 }}
                        disabled={stepAnswers.length <= 1}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))}

                  <Box mt={1}>
                    <Button variant="outlined" onClick={() => addStepAnswer(i)}>
                      + Add Answer
                    </Button>
                  </Box>
                </Box>
              )}

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
              {step.hints.map((hint, h) => {
                const hintAnswers = Array.isArray(hint.hintAnswer) ? hint.hintAnswer : [hint.hintAnswer]; // MODIFIED
                const hintIsChoiceType = hint.type === "scaffold" && (hint.problemType === "MultipleChoice" || hint.problemType === "DragDrop"); // MODIFIED
                const hintIsDragDrop = hint.type === "scaffold" && hint.problemType === "DragDrop"; // MODIFIED

                return (
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

                        {/* MODIFIED: scaffold choices for MultipleChoice/DragDrop; DragDrop pairs answers */}
                        {hintIsChoiceType && (
                          <Box mt={2}>
                            <InputLabel shrink>Choices</InputLabel>

                            {(Array.isArray(hint.choices) ? hint.choices : [hint.choices]).map((c, cIdx) => (
                              <Box key={cIdx} display="flex" alignItems="center" mt={1}>
                                <TextField
                                  required
                                  label={`Choice ${cIdx + 1}`}
                                  fullWidth
                                  value={c || ""}
                                  onChange={e => updateHintChoice(i, h, cIdx, e.target.value)}
                                />

                                {hintIsDragDrop && (
                                  <TextField
                                    required
                                    label={`Answer ${cIdx + 1}`}
                                    fullWidth
                                    value={hintAnswers[cIdx] || ""}
                                    onChange={e => updateHintAnswerAt(i, h, cIdx, e.target.value)}
                                    style={{ marginLeft: 10 }}
                                  />
                                )}

                                <Button
                                  variant="outlined"
                                  onClick={() => deleteHintChoice(i, h, cIdx)}
                                  style={{ marginLeft: 10 }}
                                  disabled={(Array.isArray(hint.choices) ? hint.choices.length : 1) <= 1}
                                >
                                  Remove
                                </Button>
                              </Box>
                            ))}

                            <Box mt={1}>
                              <Button variant="outlined" onClick={() => addHintChoice(i, h)}>
                                + Add Choice
                              </Button>
                            </Box>
                          </Box>
                        )}

                        {/* MODIFIED: scaffold multiple hint answers (non-DragDrop) */}
                        {!hintIsDragDrop && (
                          <Box mt={2}>
                            <InputLabel shrink>Hint Answers</InputLabel>

                            {hintAnswers.map((ans, aIdx) => (
                              <Box key={aIdx} display="flex" alignItems="center" mt={1}>
                                <TextField
                                  required
                                  label={`Hint Answer ${aIdx + 1}`}
                                  fullWidth
                                  value={ans || ""}
                                  onChange={e => updateHintAnswerAt(i, h, aIdx, e.target.value)}
                                />
                                <Button
                                  variant="outlined"
                                  onClick={() => deleteHintAnswer(i, h, aIdx)}
                                  style={{ marginLeft: 10 }}
                                  disabled={hintAnswers.length <= 1}
                                >
                                  Remove
                                </Button>
                              </Box>
                            ))}

                            <Box mt={1}>
                              <Button variant="outlined" onClick={() => addHintAnswer(i, h)}>
                                + Add Hint Answer
                              </Button>
                            </Box>
                          </Box>
                        )}
                      </>
                    )}
                  </Paper>
                );
              })}
            </Paper>
          );
        })}

        <Box mt={4}>
          <Button type="submit" color="primary" variant="contained">
            Submit Problem
          </Button>
        </Box>
      </form>
    </Paper>
  );
}