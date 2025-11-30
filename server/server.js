require("dotenv").config();          // Load .env
const express = require("express");  // Web server
const cors = require("cors");        // Allow frontend requests
const fileUpload = require("express-fileupload"); // For images
const fs = require("fs");
const path = require("path");

const app = express();

// Allow JSON bodies
app.use(express.json());

// Allow form-data
app.use(fileUpload());

// Allow connections from React dev server
app.use(cors());


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

        // STEP ID UNIQUENESS CHECK
        const stepIds = steps.map(s => s.id);

        // Check duplicates
        const duplicates = stepIds.filter((id, index) => stepIds.indexOf(id) !== index);

        if (duplicates.length > 0) {
            return res.status(400).json({
                error: `Duplicate step IDs found: ${duplicates.join(", ")}`
            });
        }


        // STEP Validate problemType and answerType
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
        }


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


// Start server
const PORT = process.env.PORT_SERVER || 4000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
