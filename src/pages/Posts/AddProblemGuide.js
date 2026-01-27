import React from "react";
import Spacer from "@components/Spacer";
import { useStyles } from "./Posts";
import { HELP_DOCUMENT, SITE_NAME } from "../../config/config";

const VPAT_LINK = `${process.env.PUBLIC_URL}/static/documents/OATutor_Sec508_WCAG.pdf`

const AddProblemGuide = () => {
    const classes = useStyles()
    const currentYear = new Date().getFullYear();

    return <>
        <h2>
            Guide on Adding Problems for {SITE_NAME}
        </h2>
        
        <h3>Problem Structure</h3>

        <ul>
            <li>Each problem consists of one or more steps.</li>
            <li>A problem is considered completed once all steps have been answered correctly.</li>
        </ul>

        <h3>Steps</h3>
        <ul>
            <li>A step represents a single unit of question and answer, i.e. each step have its own title, question and answer field, hints, and associated skills.</li>
            <li>You can choose one or more skills to associate with a step, or add a new skill that is not in the choices yet. Do note that, a newly added skill is not yet associated with any existing courses, and you need to manually add it to the course you wish in src\content-sources\oatutor\coursePlans.json</li>
            <li>Specific problem types have their own characteristics:</li>
            <ul>
                <li>TextBox: you can have three different answer types: "string", "arithmetic", or "numeric". The submitted answer will be matched with any of the step answers, and if any of them matches, then the answer is deemed correct.</li>
                <li>Code: with this problem type, the user will be able to write and run their own python code. For the step answer of Code problems, enter the values that the user's code should output, not the code itself. E.g. for the task "If a = 5 and b = 3, what is a*b?", the step answer should be "15", not "print(5*3)". The submitted answer will be matched with any of the step answers, and if any of them matches, then the answer is deemed correct.</li>
                <li>MultipleChoice: you will be allowed to input a list of choices, and then choose one of them as correct.</li>
                <li>DragDrop: you can input a list of choices, and the user will be tasked with putting them in the correct order. So for each choice you add, you will have to add also the choice that should be in this place in the order.</li>
            </ul>
        </ul>
        
        <h3>Learn more</h3>
        <ul>
            <li>Visit <a href="https://www.oatutor.io/" target={"_blank"} rel={"noreferrer"}>https://www.oatutor.io/</a> to explore more about OATutor, our mission, and how it can benefit you.</li>
            <li>Read our <a href="https://dl.acm.org/doi/10.1145/3544548.3581574" target={"_blank"} rel={"noreferrer"}>research paper</a> to learn more about the scientific foundation and methodology behind OATutor.</li>
        </ul>

        <Spacer height={24 * 1}/>

        <sub>
            <p>OATutor code is licensed under a MIT Open Source License, with its adaptive learning content made available under a CC BY 4.0 license.</p> 
            <p>© {currentYear}, CAHL Research Lab, UC Berkley School of Education.</p>
        </sub>
    </>
}

export default AddProblemGuide
