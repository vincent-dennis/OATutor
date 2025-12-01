require("dotenv").config();          // Load .env
const express = require("express");  // Web server
const cors = require("cors");        // Allow frontend requests
const fileUpload = require("express-fileupload"); // For images
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();

// Allow JSON bodies
app.use(express.json());

// Allow form-data
app.use(fileUpload());

// Allow connections from React dev server
app.use(cors());

const bktParamsPath = path.join(
  __dirname,
  "..",            // go from server/ -> project root
  "src",
  "content-sources",
  "oatutor",
  "bkt-params",
  "defaultBKTParams.json"
);

const skillModelPath = path.join(
  __dirname,
  "..",
  "src",
  "content-sources",
  "oatutor",
  "skillModel.json"
);

// ROUTES
// Route: Create new problems
app.post("/api/problems", async (req, res) => {
    try {
        // Extract the submitted data (sent as JSON or multipart/form-data)
        const {
            id,
            title,
            body,
            lesson,
            courseName
        } = req.body;

        // Basic validation
        if (!id || !title || !body || !lesson || !courseName) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        let steps;
        if (req.files?.steps) {
            // Steps uploaded as a JSON file
            const raw = req.files.steps.data.toString("utf8");
            try {
                steps = JSON.parse(raw);
            } catch (e) {
                return res.status(400).json({ error: "Uploaded steps.json is not valid JSON." });
            }
        } else {
            // Steps sent as a text field
            try {
                steps = JSON.parse(req.body.steps);
            } catch (e) {
                return res.status(400).json({ error: "Invalid JSON for steps." });
            }
        }

        if (!Array.isArray(steps)) {
            return res.status(400).json({ error: "Steps must be an array." });
        }

        // Automatically assign step IDs
        steps = steps.map((step, index) => ({
            ...step,
            id: `${id}-s${index + 1}`  // Auto-generated
        }));


        // Validate step problemType and answerType, skills
        const validProblemTypes = ["TextBox", "Code", "MultipleChoice", "DragDrop", "FillBlanks"];
        const validAnswerTypes = ["string", "arithmetic", "numeric"];
        for (const step of steps) {
            // 1. Check problemType
            if (!validProblemTypes.includes(step.problemType)) {
                return res.status(400).json({
                    error: `Invalid problemType for step '${step.id}': '${step.problemType}'. Valid options: ${validProblemTypes.join(", ")}`
                });
            }

            // 2. Check answerType
            if (!validAnswerTypes.includes(step.answerType)) {
                return res.status(400).json({
                    error: `Invalid answerType for step '${step.id}': '${step.answerType}'. Valid options: ${validAnswerTypes.join(", ")}`
                });
            }

            // 3. Enforce special rule: if problemType != "TextBox", answerType must be "string"
            if (step.problemType !== "TextBox" && step.answerType !== "string") {
                return res.status(400).json({
                    error: `Step '${step.id}' has problemType '${step.problemType}' but answerType '${step.answerType}' is not allowed. Only 'string' is allowed for non-TextBox steps.`
                });
            }

            // 4. Check for non-empty skills
            if (!Array.isArray(step.skills) || step.skills.length === 0) {
                return res.status(400).json({
                error: `Step ${step.id} must include a non-empty "skills" list.`
                });
            }
        }


        console.log("Received request to add problem:", id);


        // STEP A: Validate courseName exists
        const coursePlansPath = path.join(
            __dirname,
            "..",
            "src",
            "content-sources",
            "oatutor",
            "coursePlans.json"
        );

        const coursePlansRaw = fs.readFileSync(coursePlansPath, "utf8");
        const coursePlans = JSON.parse(coursePlansRaw);

        const exists = coursePlans.some(
            (c) => c.courseName === courseName
        );

        if (!exists) {
            return res.status(400).json({
                error: `Course name '${courseName}' does not exist in coursePlans.json`
            });
        }


        // STEP B: Create the problem directory
        const problemFolderPath = path.join(
            __dirname,
            "..",
            "src",
            "content-sources",
            "oatutor",
            "content-pool",
            id
        );

        // Check if the problem already exists
        if (fs.existsSync(problemFolderPath)) {
            return res.status(400).json({
                error: `Problem with id '${id}' already exists. Choose a different id.`
            });
        }

        // Create the folder
        fs.mkdirSync(problemFolderPath, { recursive: true });

        console.log("Created problem folder:", problemFolderPath);


        // STEP C: Create the main <problem-id>.json file
        const problemJsonPath = path.join(problemFolderPath, `${id}.json`);

        const problemData = {
            id,
            title,
            body,
            lesson,
            courseName
        };

        fs.writeFileSync(problemJsonPath, JSON.stringify(problemData, null, 4), "utf8");

        console.log("Created main problem JSON:", problemJsonPath);


        // STEP D: Create the steps folder
        const stepsFolderPath = path.join(problemFolderPath, "steps");
        fs.mkdirSync(stepsFolderPath, { recursive: true });

        console.log("Created steps folder:", stepsFolderPath);

        let bktParams = JSON.parse(fs.readFileSync(bktParamsPath, "utf8"));
        // Convert skill definitions to a Set for fast lookups
        const knownSkills = new Set(Object.keys(bktParams));
        // Track new skills discovered during this request
        const newSkills = new Set();

        let skillModel = {};
        try {
            skillModel = JSON.parse(fs.readFileSync(skillModelPath, "utf8"));
        } catch (e) {
            console.log("skillModel.json not found or invalid. Creating a new one.");
            skillModel = {};
        }

        // Iterate through each step 
        for (const step of steps) {
            console.log("Processing step:", step.id);

            // 1. Step folder
            const stepFolderPath = path.join(stepsFolderPath, step.id);
            fs.mkdirSync(stepFolderPath, { recursive: true });
            console.log("  Created step folder:", stepFolderPath);

            // 2. Step JSON file
            const stepJsonPath = path.join(stepFolderPath, `${step.id}.json`);

            const stepJsonData = {
                id: step.id,
                stepAnswer: Array.isArray(step.stepAnswer)
                    ? step.stepAnswer
                    : [step.stepAnswer],  // ensure it's always an array
                problemType: step.problemType,
                stepTitle: step.stepTitle,
                stepBody: step.stepBody,
                answerType: step.answerType
            };

            fs.writeFileSync(stepJsonPath, JSON.stringify(stepJsonData, null, 4));
            console.log("  Created step JSON:", stepJsonPath);

            // 3. Tutoring folder + default pathway
            // Create tutoring folder
            const tutoringFolder = path.join(stepFolderPath, "tutoring");
            fs.mkdirSync(tutoringFolder);

            // Build the DefaultPathway array
            // Hints come from step.hints (sent by the frontend)
            const hints = step.hints.map((hint, index) => {
                const hintId = `${step.id}-h${index + 1}`;
                const dependencies = index === 0 ? [] : [`${step.id}-h${index}`];

                if (hint.type === "scaffold") {
                    // 1. Check problemType
                    if (!validProblemTypes.includes(hint.problemType)) {
                        return res.status(400).json({
                            error: `Invalid problemType for hint '${hintId}': '${hint.problemType}'. Valid options: ${validProblemTypes.join(", ")}`
                        });
                    }

                    // 2. Check answerType
                    if (!validAnswerTypes.includes(hint.answerType)) {
                        return res.status(400).json({
                            error: `Invalid answerType for hint '${hintId}': '${hint.answerType}'. Valid options: ${validAnswerTypes.join(", ")}`
                        });
                    }

                    // 3. Enforce special rule: if problemType != "TextBox", answerType must be "string"
                    if (hint.problemType !== "TextBox" && hint.answerType !== "string") {
                        return res.status(400).json({
                            error: `Hint '${hintId}' has problemType '${hint.problemType}' but answerType '${hint.answerType}' is not allowed. Only 'string' is allowed for non-TextBox scaffolds.`
                        });
                    }

                    // Scaffold hint format
                    return {
                        id: hintId,
                        type: "scaffold",
                        problemType: hint.problemType,
                        answerType: hint.answerType,
                        hintAnswer: Array.isArray(hint.hintAnswer)
                            ? hint.hintAnswer
                            : [hint.hintAnswer],   // ensure array
                        dependencies: dependencies,
                        title: hint.title,
                        text: hint.text
                    };
                }

                // Default hint format
                return {
                    id: hintId,
                    type: "hint",
                    dependencies: dependencies,
                    title: hint.title,
                    text: hint.text
                };
            });

            // Write the DefaultPathway file
            const defaultPathwayPath = path.join(tutoringFolder, `${step.id}DefaultPathway.json`);
            fs.writeFileSync(defaultPathwayPath, JSON.stringify(hints, null, 4));

            // 4. Skill
            // Add skills for the step into skillModel.json
            skillModel[step.id] = step.skills;
            // Track new skills
            for (const skill of step.skills) {
                if (!knownSkills.has(skill)) {
                    newSkills.add(skill);
                    knownSkills.add(skill);
                }
            }
        }

        // Add new skills into defaultBKTParams.json
        if (newSkills.size > 0) {
            console.log("Adding new skills to BKT params:", Array.from(newSkills));

            // Add each missing skill to bktParams with default values
            for (const skill of newSkills) {
                bktParams[skill] = {
                    "probMastery": 0.1,
                    "probTransit": 0.1,
                    "probSlip": 0.1,
                    "probGuess": 0.1
                };
            }

            // Atomic-ish safe write
            const tmpPath = bktParamsPath + ".tmp";
            fs.writeFileSync(tmpPath, JSON.stringify(bktParams, null, 4), "utf8");
            fs.renameSync(tmpPath, bktParamsPath);

            console.log("BKT Params updated successfully");
        }

        // Add step skills into skillModel.json
        const skillModelTemp = skillModelPath + ".tmp";
        fs.writeFileSync(skillModelTemp, JSON.stringify(skillModel, null, 4), "utf8");
        fs.renameSync(skillModelTemp, skillModelPath);
        console.log("skillModel.json updated successfully");


        // STEP E: Handle uploaded figure files
        if (req.files && Object.keys(req.files).length > 0) {
            console.log("Files detected in request:", Object.keys(req.files));

            // 1. Create the figures folder
            const figuresFolder = path.join(problemFolderPath, "figures");
            fs.mkdirSync(figuresFolder, { recursive: true });

            // 2. Save each figure file
            for (const fileKey of Object.keys(req.files)) {
                if (fileKey === "steps") {
                    console.log("Skipping steps file:", fileKey);
                    continue;
                }

                const fileObject = req.files[fileKey];   // the uploaded file

                const savePath = path.join(figuresFolder, fileObject.name);

                // fileObject.mv() moves the file to our desired folder
                await fileObject.mv(savePath);

                console.log("  Saved figure:", savePath);
            }
        }


        // FINISHED
        return res.json({
            message: "New problem created successfully!",
            filesSaved: req.files ? Object.keys(req.files) : []
        });

    } catch (err) {
        console.error("Error handling problem creation:", err);
        return res.status(500).json({ error: "Internal server error." });
    }
});


// Route: re-process problem pool
app.post("/api/reload-problems", (req, res) => {
    const scriptPath = path.join(
        __dirname,
        "..",
        "src",
        "tools",
        "preprocessProblemPool.js"
    );

    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error("Error running preprocess script:", error);
            return res.status(500).json({ error: "Failed to reload problems" });
        }

        return res.json({
            message: "Problems reloaded successfully"
        });
    });
});


// Start server
const PORT = process.env.PORT_SERVER || 4000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
