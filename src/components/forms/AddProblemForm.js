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
  Chip,
  Container,
  Typography,
  Divider
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import IconButton from "@material-ui/core/IconButton";
import HelpOutlineOutlinedIcon from "@material-ui/icons/HelpOutlineOutlined";
import Popup from "../Popup/Popup.js";
import AddProblemGuide from "../../pages/Posts/AddProblemGuide.js";

const problemTypes = ["TextBox", "Code", "MultipleChoice", "DragDrop"];
const answerTypes = ["string", "arithmetic", "numeric"];

const useStyles = makeStyles(theme => ({
  page: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(6)
  },
  rootPaper: {
    padding: theme.spacing(3),
    borderRadius: theme.spacing(2)
  },
  header: {
    marginBottom: theme.spacing(2)
  },
  form: {
    marginTop: theme.spacing(2)
  },
  sectionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    marginTop: theme.spacing(3)
  },
  stepPaper: {
    padding: theme.spacing(2.5),
    marginTop: theme.spacing(3),
    borderRadius: theme.spacing(2)
  },
  stepHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2)
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 14,
    background: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontWeight: 700,
    fontSize: 13,
    flex: "0 0 auto"
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.25)
  },
  hintPaper: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(2),
    borderRadius: theme.spacing(2),
    background: theme.palette.action.hover
  },
  hintHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(1)
  },
  chip: {
    margin: theme.spacing(0.5)
  },
  fileInput: {
    marginTop: theme.spacing(1)
  },
  submitRow: {
    marginTop: theme.spacing(4),
    display: "flex",
    justifyContent: "flex-end"
  }
}));

// DragDrop "answer is a reordering of choices" helpers (multiset equality)
const _norm = v => (v == null ? "" : String(v)).trim();

const _toArray = v => (Array.isArray(v) ? v : (v != null ? [v] : []));

const _countBy = arr =>
  arr.reduce((acc, v) => {
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});

const _uniqueInOrder = arr => {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
};

const _multisetDiff = (a, b) => {
  const ca = _countBy(a);
  const cb = _countBy(b);
  const keys = new Set([...Object.keys(ca), ...Object.keys(cb)]);
  const diffs = [];
  keys.forEach(k => {
    const ac = ca[k] || 0;
    const bc = cb[k] || 0;
    if (ac !== bc) diffs.push({ value: k, choices: ac, answers: bc });
  });
  return diffs;
};

const _multisetEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return _multisetDiff(a, b).length === 0;
};

const _formatDiff = (diffs, limit = 4) => {
  const parts = diffs
    .slice(0, limit)
    .map(d => `'${d.value}': choices ${d.choices} vs answer ${d.answers}`);
  return parts.join("; ") + (diffs.length > limit ? "…" : "");
};

// Keeps DragDrop answers (trimmed strings) within the multiset of choices, preserving order and length.
// Intended for "while-editing" sanitation; final equality is enforced on submit.
const _sanitizeDragDropAnswers = (rawChoices, rawAnswers) => {
  const choicesArr = _toArray(rawChoices).map(_norm);
  const targetLen = Math.max(choicesArr.length, 1);
  const available = _countBy(choicesArr.filter(Boolean));

  const answersArr = _toArray(rawAnswers).map(_norm);
  const out = Array(targetLen).fill("");
  const used = {};

  for (let i = 0; i < targetLen; i++) {
    const v = answersArr[i] || "";
    if (!v) continue;
    if (!available[v]) continue;

    used[v] = (used[v] || 0) + 1;
    if (used[v] > available[v]) {
      used[v] -= 1;
      continue;
    }
    out[i] = v;
  }
  return out;
};

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

  const [showPopup, setShowPopup] = useState(false);
  const togglePopup = () => setShowPopup(prev => !prev);

  const classes = useStyles();

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
          answerType: "string",
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

        // answerType applies to TextBox; DragDrop must be "DragDrop"; other non-TextBox default to "string"
        if (value === "DragDrop") {
          updated[index].answerType = "DragDrop";
        } else if (value !== "TextBox") {
          updated[index].answerType = "string";
        } else if (!updated[index].answerType || !answerTypes.includes(updated[index].answerType)) {
          updated[index].answerType = "string";
        }

        // choices required for MultipleChoice and DragDrop + initialize arrays
        if (
          (value === "MultipleChoice" || value === "DragDrop") &&
          (!Array.isArray(updated[index].choices) || updated[index].choices.length === 0)
        ) {
          updated[index].choices = [""];
        }

        // DragDrop requires stepAnswer length === choices length
        if (value === "DragDrop") {
          const choicesLen = Array.isArray(updated[index].choices) ? updated[index].choices.length : 0;
          const ans = Array.isArray(updated[index].stepAnswer) ? [...updated[index].stepAnswer] : [];
          const targetLen = Math.max(choicesLen, 1);

          if (ans.length < targetLen) ans.push(...Array(targetLen - ans.length).fill(""));
          if (ans.length > targetLen) ans.splice(targetLen);

          updated[index].stepAnswer = ans.length ? ans : [""];
          updated[index].stepAnswer = _sanitizeDragDropAnswers(updated[index].choices, updated[index].stepAnswer); 
        }

        if (value === "MultipleChoice") {
          const choicesTrimmed = _toArray(updated[index].choices).map(_norm).filter(Boolean);
          const ans0 = _norm(_toArray(updated[index].stepAnswer)[0] || "");
          updated[index].stepAnswer = [choicesTrimmed.includes(ans0) ? ans0 : ""];
        }

        return { ...prev, steps: updated };
      }

      updated[index][field] = value;

      // answerType is fixed unless problemType is TextBox; DragDrop must be "DragDrop"
      if (field === "answerType" && updated[index].problemType !== "TextBox") {
        updated[index].answerType = updated[index].problemType === "DragDrop" ? "DragDrop" : "string";
      }
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

      // DragDrop sync stepAnswer length with choices
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

      if (updated[stepIndex].problemType === "MultipleChoice") {
        const choicesTrimmed = _toArray(updated[stepIndex].choices).map(_norm).filter(Boolean);
        const ans0 = _norm(_toArray(updated[stepIndex].stepAnswer)[0] || "");
        updated[stepIndex].stepAnswer = [choicesTrimmed.includes(ans0) ? ans0 : ""];
      }

      if (updated[stepIndex].problemType === "DragDrop") {
        updated[stepIndex].stepAnswer = _sanitizeDragDropAnswers(updated[stepIndex].choices, updated[stepIndex].stepAnswer); 
      }

      return { ...prev, steps: updated };
    });
  };

  const deleteChoice = (stepIndex, choiceIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const current = Array.isArray(updated[stepIndex].choices) ? [...updated[stepIndex].choices] : [];
      current.splice(choiceIndex, 1);

      // keep at least one row when MultipleChoice or DragDrop
      if (
        (updated[stepIndex].problemType === "MultipleChoice" || updated[stepIndex].problemType === "DragDrop") &&
        current.length === 0
      ) {
        updated[stepIndex].choices = [""];
      } else {
        updated[stepIndex].choices = current;
      }

      if (updated[stepIndex].problemType === "MultipleChoice") {
        const choicesTrimmed = _toArray(updated[stepIndex].choices).map(_norm).filter(Boolean);
        const ans0 = _norm(_toArray(updated[stepIndex].stepAnswer)[0] || "");
        updated[stepIndex].stepAnswer = [choicesTrimmed.includes(ans0) ? ans0 : ""];
      }

      // DragDrop sync stepAnswer length with choices (and keep at least one)
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

        updated[stepIndex].stepAnswer = _sanitizeDragDropAnswers(updated[stepIndex].choices, updated[stepIndex].stepAnswer); 
      }

      return { ...prev, steps: updated };
    });
  };

  // stepAnswer helpers to allow multiple answers (non-DragDrop)
  const addStepAnswer = (stepIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];

      // MultipleChoice only allows one answer
      if (updated[stepIndex].problemType === "MultipleChoice") {
        updated[stepIndex].stepAnswer = [_norm(_toArray(updated[stepIndex].stepAnswer)[0] || "")];
        return { ...prev, steps: updated };
      }

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
      // DragDrop answers are stored as trimmed choice labels and kept within the choice multiset.
      const nextVal = updated[stepIndex].problemType === "DragDrop" ? _norm(value) : value;
      current[answerIndex] = nextVal;
      updated[stepIndex].stepAnswer = current.length ? current : [""];

      if (updated[stepIndex].problemType === "DragDrop") {
        updated[stepIndex].stepAnswer = _sanitizeDragDropAnswers(updated[stepIndex].choices, updated[stepIndex].stepAnswer); 
      }
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
            answerType: "string",
            hintAnswer: [""],
            choices: [], // scaffold supports choices for MultipleChoice/DragDrop
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

      // scaffold problemType change initializes choices + sync DragDrop answers
      if (hint.type === "scaffold" && field === "problemType") {
        hint[field] = value;

        // answerType applies to TextBox; DragDrop must be "DragDrop"; other non-TextBox default to "string"
        if (value === "DragDrop") {
          hint.answerType = "DragDrop";
        } else if (value !== "TextBox") {
          hint.answerType = "string";
        } else if (!hint.answerType || !answerTypes.includes(hint.answerType)) {
          hint.answerType = "string";
        }

        if (
          (value === "MultipleChoice" || value === "DragDrop") &&
          (!Array.isArray(hint.choices) || hint.choices.length === 0)
        ) {
          hint.choices = [""];
        }

        if (value === "MultipleChoice") {
          const choicesTrimmed = _toArray(hint.choices).map(_norm).filter(Boolean);
          const ans0 = _norm(_toArray(hint.hintAnswer)[0] || "");
          hint.hintAnswer = [choicesTrimmed.includes(ans0) ? ans0 : ""];
        }

        if (value === "DragDrop") {
          const choicesLen = Array.isArray(hint.choices) ? hint.choices.length : 0;
          const ans = Array.isArray(hint.hintAnswer) ? [...hint.hintAnswer] : [];
          const targetLen = Math.max(choicesLen, 1);

          if (ans.length < targetLen) ans.push(...Array(targetLen - ans.length).fill(""));
          if (ans.length > targetLen) ans.splice(targetLen);

          hint.hintAnswer = ans.length ? ans : [""];
          hint.hintAnswer = _sanitizeDragDropAnswers(hint.choices, hint.hintAnswer); 
        }

        return { ...prev, steps: updated };
      }

      if (hint.type === "scaffold" && field === "answerType" && hint.problemType !== "TextBox") {
        hint.answerType = hint.problemType === "DragDrop" ? "DragDrop" : "string";
        return { ...prev, steps: updated };
      }

      hint[field] = value;
      return { ...prev, steps: updated };
    });
  };

  // scaffold choices helpers (MultipleChoice/DragDrop)
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

      if (hint.problemType === "MultipleChoice") {
        const choicesTrimmed = _toArray(hint.choices).map(_norm).filter(Boolean);
        const ans0 = _norm(_toArray(hint.hintAnswer)[0] || "");
        hint.hintAnswer = [choicesTrimmed.includes(ans0) ? ans0 : ""];
      }

      if (hint.problemType === "DragDrop") {
        hint.hintAnswer = _sanitizeDragDropAnswers(hint.choices, hint.hintAnswer); 
      }

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

      if (hint.problemType === "MultipleChoice") {
        const choicesTrimmed = _toArray(hint.choices).map(_norm).filter(Boolean);
        const ans0 = _norm(_toArray(hint.hintAnswer)[0] || "");
        hint.hintAnswer = [choicesTrimmed.includes(ans0) ? ans0 : ""];
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

        hint.hintAnswer = _sanitizeDragDropAnswers(hint.choices, hint.hintAnswer); 
      }

      return { ...prev, steps: updated };
    });
  };

  // scaffold hintAnswer helpers (allow multiple; non-DragDrop)
  const addHintAnswer = (stepIndex, hintIndex) => {
    setForm(prev => {
      const updated = [...prev.steps];
      const hint = updated[stepIndex].hints[hintIndex];

      // MultipleChoice only allows one answer
      if (hint.problemType === "MultipleChoice") {
        hint.hintAnswer = [_norm(_toArray(hint.hintAnswer)[0] || "")];
        return { ...prev, steps: updated };
      }

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
      // DragDrop scaffold answers are stored as trimmed choice labels and kept within the choice multiset.
      const nextVal = hint.problemType === "DragDrop" ? _norm(value) : value;
      current[answerIndex] = nextVal;
      hint.hintAnswer = current.length ? current : [""];

      if (hint.problemType === "DragDrop") {
        hint.hintAnswer = _sanitizeDragDropAnswers(hint.choices, hint.hintAnswer); 
      }
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

        // choices required for MultipleChoice and DragDrop; DragDrop also enforces answer length
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

          if (s.problemType === "MultipleChoice") {
            const rawAns = _toArray(s.stepAnswer);
            const ans0 = _norm(rawAns[0] || "");
            const choicesTrimmed = rawChoices.map(c => (c == null ? "" : String(c)).trim());

            if (rawAns.length !== 1) {
              toast.error(`Step ${i + 1} MultipleChoice requires exactly one stepAnswer.`);
              return;
            }
            if (!ans0) {
              toast.error(`Step ${i + 1} MultipleChoice requires a non-empty stepAnswer.`);
              return;
            }
            if (!choicesTrimmed.includes(ans0)) {
              toast.error(`Step ${i + 1} MultipleChoice stepAnswer must be one of the choices.`);
              return;
            }
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

            // enforce DragDrop answer is a permutation (same multiset) of choices
            if (!_multisetEqual(choicesTrimmed, ansTrimmed)) {
              const diffs = _multisetDiff(choicesTrimmed, ansTrimmed);
              toast.error(`Step ${i + 1} DragDrop stepAnswer must be a reordering of choices. ${_formatDiff(diffs)}`);
              return;
            }
          }
        }

        // validate scaffold hints with same rules
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
            
            if (hint.problemType === "MultipleChoice") {
              if (rawAns.length !== 1) {
                toast.error(`Step ${i + 1}, Hint ${h + 1} MultipleChoice requires exactly one hintAnswer.`);
                return;
              }
              const ans0 = _norm(rawAns[0] || "");
              if (!ans0) {
                toast.error(`Step ${i + 1}, Hint ${h + 1} MultipleChoice requires a non-empty hintAnswer.`);
                return;
              }
              if (!choicesTrimmed.includes(ans0)) {
                toast.error(`Step ${i + 1}, Hint ${h + 1} MultipleChoice hintAnswer must be one of the choices.`);
                return;
              }
            }

            if (hint.problemType === "DragDrop") {
              if (rawAns.length !== rawChoices.length) {
                toast.error(`Step ${i + 1}, Hint ${h + 1} DragDrop requires hintAnswer length to match choices length.`);
                return;
              }
              if (ansTrimmed.some(a => !a)) {
                toast.error(`Step ${i + 1}, Hint ${h + 1} DragDrop has empty hintAnswer values.`);
                return;
              }

              // enforce DragDrop scaffold answer is a permutation (same multiset) of choices
              if (!_multisetEqual(choicesTrimmed, ansTrimmed)) {
                const diffs = _multisetDiff(choicesTrimmed, ansTrimmed);
                toast.error(`Step ${i + 1}, Hint ${h + 1} DragDrop hintAnswer must be a reordering of choices. ${_formatDiff(diffs)}`);
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

        // trim + normalize DragDrop payloads so answers match choices exactly (post-trim)
        if (rest.problemType === "DragDrop") {
          const ch = _toArray(rest.choices).map(_norm);
          const ans = _toArray(rest.stepAnswer).map(_norm);

          while (ans.length < ch.length) ans.push("");
          if (ans.length > ch.length) ans.splice(ch.length);

          rest.choices = ch.length ? ch : [""];
          rest.stepAnswer = ans.length ? ans : [""];
        }

        // answerType only applies to TextBox; DragDrop must be "DragDrop"; default to "string" otherwise
        if (rest.problemType === "DragDrop") {
          rest.answerType = "DragDrop";
        } else if (rest.problemType !== "TextBox") {
          rest.answerType = "string";
        } else if (!rest.answerType || !answerTypes.includes(rest.answerType)) {
          rest.answerType = "string";
        }

        // apply same trimming/normalization to scaffold DragDrop hints
        if (Array.isArray(rest.hints)) {
          rest.hints = rest.hints.map(h => {
            if (h && h.type === "scaffold" && h.problemType === "DragDrop") {
              const ch = _toArray(h.choices).map(_norm);
              const ans = _toArray(h.hintAnswer).map(_norm);

              while (ans.length < ch.length) ans.push("");
              if (ans.length > ch.length) ans.splice(ch.length);

              return {
                ...h,
                answerType: "DragDrop",
                choices: ch.length ? ch : [""],
                hintAnswer: ans.length ? ans : [""]
              };
            }
            if (h && h.type === "scaffold") {
              if (h.problemType === "DragDrop") {
                return { ...h, answerType: "DragDrop" };
              }
              if (h.problemType !== "TextBox") {
                return { ...h, answerType: "string" };
              }
              if (!h.answerType || !answerTypes.includes(h.answerType)) {
                return { ...h, answerType: "string" };
              }
            }
            return h;
          });
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

  if (loading) {
    return (
      <Container maxWidth="md" className={classes.page}>
        <Paper className={classes.rootPaper} elevation={2}>
          <Typography variant="h6">Loading…</Typography>
        </Paper>
      </Container>
    );
  }

  /** --------------------------------
   * RENDER COMPONENT
   * -------------------------------- */
  return (
    <Container maxWidth="md" className={classes.page}>
      <Paper className={classes.rootPaper} elevation={2}>
        <Box className={classes.header} display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="h4" gutterBottom>
              Add New Problem
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Course <b>{courseName}</b> · Lesson <b>{lessonName}</b>
            </Typography>
          </Box>

          <IconButton aria-label="Add problem guide" onClick={togglePopup}>
            <HelpOutlineOutlinedIcon />
          </IconButton>
        </Box>

        <Divider />

        <form onSubmit={submitForm} className={classes.form}>

        <Box mb={1}>
          <Typography variant="h6">Problem Details</Typography>
        </Box>

        {/* BASIC FIELDS --------------------------------------------------- */}
        <TextField
          variant="outlined"
          required
          label="Problem ID"
          fullWidth
          onBlur={e => updateField("id", e.target.value)}
          defaultValue={form.id}
          margin="normal"
        />
        <TextField
          variant="outlined"
          required
          label="Problem Title"
          fullWidth
          onBlur={e => updateField("title", e.target.value)}
          defaultValue={form.title}
          margin="normal"
        />
        <TextField
                  variant="outlined"
          required
          label="Problem Body"
          fullWidth
          multiline
          onBlur={e => updateField("body", e.target.value)}
          defaultValue={form.body}
          margin="normal"
        />

        {/* IMAGES ---------------------------------------------------------- */}
        <Box mt={2}>
            <Typography variant="h6">Images</Typography>
            <Typography variant="body2" color="textSecondary">
              Max 5 images, total 20MB. To include in problem or step body: ##[filename]
            </Typography>
            <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className={classes.fileInput}
            />
            {/* Display uploaded file names */}
            <Box mt={1} display="flex" flexWrap="wrap">
                {form.images.map((file, i) => (
                    <Chip
                        key={i}
                        label={file.name}
                        variant="outlined"
                        className={classes.chip}
                    />
                ))}
            </Box>
        </Box>

        {/* STEPS ------------------------------------------------------------ */}
        <Box className={classes.sectionRow}>
          <Typography variant="h6">Problem Steps</Typography>
          <Button variant="outlined" color="primary" onClick={addStep}>
            + Add Step
          </Button>
        </Box>

        {form.steps.map((step, i) => {
          const stepAnswers = Array.isArray(step.stepAnswer) ? step.stepAnswer : [step.stepAnswer];
          const isChoiceType = step.problemType === "MultipleChoice" || step.problemType === "DragDrop";
          const isDragDrop = step.problemType === "DragDrop";

          // DragDrop answers must be a reordering of choices (choose from choices; enforce multiplicities)
          const stepChoicesTrimmed = isDragDrop
            ? (Array.isArray(step.choices) ? step.choices : [step.choices]).map(_norm)
            : [];
          const stepDragDropOptions = isDragDrop ? _uniqueInOrder(stepChoicesTrimmed.filter(Boolean)) : [];
          const stepChoiceCounts = isDragDrop ? _countBy(stepChoicesTrimmed.filter(Boolean)) : {};
          const stepAnswersTrimmed = isDragDrop ? stepAnswers.map(_norm) : [];

          return (
            <Paper key={i} variant="outlined" className={classes.stepPaper}>
              <Box className={classes.stepHeader}>
                <Box className={classes.headerLeft}>
                  <span className={classes.badge}>{i + 1}</span>
                  <Typography variant="h6">Step {i + 1}</Typography>
                </Box>
                {step.problemType ? (
                  <Chip label={step.problemType} size="small" variant="outlined" />
                ) : null}
              </Box>
              <Divider style={{ marginTop: 12 }} />

              {/* Step Title */}
              <TextField
                  variant="outlined"
                required
                label="Step Title"
                fullWidth
                margin="normal"
                defaultValue={step.stepTitle}
                onBlur={e => updateStep(i, "stepTitle", e.target.value)}
              />

              {/* Step Body */}
              <TextField
                variant="outlined"
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
                  variant="outlined"
                  label="New Skill"
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
                  disableElevation
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
                      className={classes.chip}
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

              {/* Choices inputs for MultipleChoice and DragDrop; DragDrop shows paired answers */}
              {isChoiceType && (
                <Box mt={2}>
                  <InputLabel shrink>Choices</InputLabel>

                  {(Array.isArray(step.choices) ? step.choices : [step.choices]).map((choice, cIdx) => {
                    const usedCountsExcl = isDragDrop
                      ? _countBy(stepAnswersTrimmed.filter((v, idx) => idx !== cIdx && v))
                      : {};

                    return (
                      <Box key={cIdx} display="flex" alignItems="center" mt={1}>
                        <TextField
                  variant="outlined"
                          required
                          label={`Choice ${cIdx + 1}`}
                          fullWidth
                          value={choice || ""}
                          onChange={e => updateChoice(i, cIdx, e.target.value)}
                          style={{ flex: 1 }} 
                        />

                        {isDragDrop && (
                          <FormControl fullWidth style={{ marginLeft: 10, flex: 1 }}>
                            <Select
                              value={stepAnswersTrimmed[cIdx] || ""}
                              onChange={e => updateStepAnswerAt(i, cIdx, e.target.value)}
                              displayEmpty
                            >
                              <MenuItem value="">
                                <em>Select answer to go in this position</em>
                              </MenuItem>

                              {stepDragDropOptions.map(opt => (
                                <MenuItem
                                  key={opt}
                                  value={opt}
                                  disabled={(usedCountsExcl[opt] || 0) >= (stepChoiceCounts[opt] || 0)}
                                >
                                  {opt}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
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
                    );
                  })}

                  <Box mt={1}>
                    <Button variant="outlined" onClick={() => addChoice(i)}>
                      + Add Choice
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Answer Type (TextBox only) */}
              {step.problemType === "TextBox" && (
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
              )}

              {/* Multiple step answers (non-DragDrop) */}
              {!isDragDrop && (
                step.problemType === "MultipleChoice" ? (
                  <Box mt={2}>
                    <InputLabel shrink>Step Answer</InputLabel>
                    <FormControl fullWidth style={{ marginTop: 8 }}>
                      <Select
                        value={_norm(stepAnswers[0] || "")}
                        onChange={e => updateStepAnswerAt(i, 0, e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Select correct choice</em>
                        </MenuItem>
                        {_toArray(step.choices).map((c, idx) => {
                          const v = _norm(c);
                          return v ? <MenuItem key={`${v}-${idx}`} value={v}>{v}</MenuItem> : null;
                        })}
                      </Select>
                    </FormControl>
                  </Box>
                ) : (
                  <Box mt={2}>
                    <InputLabel shrink>Step Answers</InputLabel>

                    {stepAnswers.map((ans, aIdx) => (
                      <Box key={aIdx} display="flex" alignItems="center" mt={1}>
                        <TextField
                          variant="outlined"
                          required
                          multiline
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
                )
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
                const hintAnswers = Array.isArray(hint.hintAnswer) ? hint.hintAnswer : [hint.hintAnswer];
                const hintIsChoiceType = hint.type === "scaffold" && (hint.problemType === "MultipleChoice" || hint.problemType === "DragDrop");
                const hintIsDragDrop = hint.type === "scaffold" && hint.problemType === "DragDrop";

                // DragDrop scaffold answers must be a reordering of choices (choose from choices; enforce multiplicities)
                const hintChoicesTrimmed = hintIsDragDrop
                  ? (Array.isArray(hint.choices) ? hint.choices : [hint.choices]).map(_norm)
                  : [];
                const hintDragDropOptions = hintIsDragDrop ? _uniqueInOrder(hintChoicesTrimmed.filter(Boolean)) : [];
                const hintChoiceCounts = hintIsDragDrop ? _countBy(hintChoicesTrimmed.filter(Boolean)) : {};
                const hintAnswersTrimmed = hintIsDragDrop ? hintAnswers.map(_norm) : [];

                return (
                  <Paper key={h} variant="outlined" className={classes.hintPaper}>
                    <Box className={classes.hintHeader}>
                      <Typography variant="subtitle1">Hint {h + 1}</Typography>
                      <Chip label={hint.type} size="small" variant="outlined" />
                    </Box>

                    <TextField
                      variant="outlined"
                      required
                      label="Title"
                      fullWidth
                      margin="normal"
                      defaultValue={hint.title}
                      onBlur={e => updateHint(i, h, "title", e.target.value)}
                    />

                    <TextField
                      variant="outlined"
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

                        {hint.problemType === "TextBox" && (
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
                        )}

                        {/* scaffold choices for MultipleChoice/DragDrop; DragDrop pairs answers */}
                        {hintIsChoiceType && (
                          <Box mt={2}>
                            <InputLabel shrink>Choices</InputLabel>

                            {(Array.isArray(hint.choices) ? hint.choices : [hint.choices]).map((c, cIdx) => {
                              const usedCountsExcl = hintIsDragDrop
                                ? _countBy(hintAnswersTrimmed.filter((v, idx) => idx !== cIdx && v))
                                : {};

                              return (
                                <Box key={cIdx} display="flex" alignItems="center" mt={1}>
                                  <TextField
                                    variant="outlined"
                                    required
                                    label={`Choice ${cIdx + 1}`}
                                    fullWidth
                                    value={c || ""}
                                    onChange={e => updateHintChoice(i, h, cIdx, e.target.value)}
                                    style={{ flex: 1 }} 
                                  />

                                  {hintIsDragDrop && (
                                    <FormControl fullWidth style={{ marginLeft: 10, flex: 1 }}>
                                      <Select
                                        value={hintAnswersTrimmed[cIdx] || ""}
                                        onChange={e => updateHintAnswerAt(i, h, cIdx, e.target.value)}
                                        displayEmpty
                                      >
                                        <MenuItem value="">
                                          <em>Select answer</em>
                                        </MenuItem>

                                        {hintDragDropOptions.map(opt => (
                                          <MenuItem
                                            key={opt}
                                            value={opt}
                                            disabled={(usedCountsExcl[opt] || 0) >= (hintChoiceCounts[opt] || 0)}
                                          >
                                            {opt}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
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
                              );
                            })}

                            <Box mt={1}>
                              <Button variant="outlined" onClick={() => addHintChoice(i, h)}>
                                + Add Choice
                              </Button>
                            </Box>
                          </Box>
                        )}

                        {/* scaffold multiple hint answers (non-DragDrop) */}
                        {!hintIsDragDrop && (
                          hint.problemType === "MultipleChoice" ? (
                            <Box mt={2}>
                              <InputLabel shrink>Hint Answer</InputLabel>
                              <FormControl fullWidth style={{ marginTop: 8 }}>
                                <Select
                                  value={_norm(hintAnswers[0] || "")}
                                  onChange={e => updateHintAnswerAt(i, h, 0, e.target.value)}
                                  displayEmpty
                                >
                                  <MenuItem value="">
                                    <em>Select correct choice</em>
                                  </MenuItem>
                                  {_toArray(hint.choices).map((c, idx) => {
                                    const v = _norm(c);
                                    return v ? <MenuItem key={`${v}-${idx}`} value={v}>{v}</MenuItem> : null;
                                  })}
                                </Select>
                              </FormControl>
                            </Box>
                          ) : (
                            <Box mt={2}>
                              <InputLabel shrink>Hint Answers</InputLabel>

                              {hintAnswers.map((ans, aIdx) => (
                                <Box key={aIdx} display="flex" alignItems="center" mt={1}>
                                  <TextField
                                    variant="outlined"
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
                          )
                        )}
                      </>
                    )}
                  </Paper>
                );
              })}
            </Paper>
          );
        })}

        <Box className={classes.submitRow}>
          <Button type="submit" color="primary" variant="contained" disableElevation>
            Submit Problem
          </Button>
        </Box>
      </form>
      <Popup isOpen={showPopup} onClose={togglePopup}>
        <AddProblemGuide />
      </Popup>
      </Paper>
    </Container>
  );
}