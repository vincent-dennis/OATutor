import React, { Fragment } from 'react';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Paper from '@material-ui/core/Paper';
import { withStyles } from '@material-ui/core/styles';
import styles from './common-styles.js';
import IconButton from '@material-ui/core/IconButton';
import { _coursePlansNoEditor, ThemeContext, SITE_NAME, SHOW_COPYRIGHT } from '../../config/config.js';
import Spacer from "../Spacer";
import HelpOutlineOutlinedIcon from "@material-ui/icons/HelpOutlineOutlined";
import { Typography } from "@material-ui/core";
import { IS_STAGING_OR_DEVELOPMENT } from "../../util/getBuildType";
import BuildTimeIndicator from "@components/BuildTimeIndicator";
import withTranslation from "../../util/withTranslation.js";
import Popup from '../Popup/Popup.js';
import About from '../../pages/Posts/About.js';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import { toast } from "react-toastify";

class LessonSelection extends React.Component {
    static contextType = ThemeContext;

    constructor(props, context) {
        super(props);
        const { courseNum, setLanguage } = this.props;

        if (courseNum == 6) {
            setLanguage('se')
        } 
        
        if (props.history.location.pathname == '/') {
            const defaultLocale = localStorage.getItem('defaultLocale');
            setLanguage(defaultLocale)
        }

        this.user = context.user || {}
        this.isPrivileged = !!this.user.privileged

        this.coursePlans = _coursePlansNoEditor;
        this.togglePopup = this.togglePopup.bind(this);

        this.state = {
            preparedRemoveProgress: false,
            removedProgress: false,
            showPopup: false
        }
    }

    togglePopup = () => {
        console.log("Toggling popup visibility");
        this.setState((prevState) => ({
          showPopup: !prevState.showPopup,
        }));
      };
      
    removeProgress = () => {
        this.setState({ removedProgress: true });
        this.props.removeProgress();
    }

    prepareRemoveProgress = () => {
        this.setState({ preparedRemoveProgress: true });
    }

    reloadProblemPool = async () => {
        try {
            console.log("start reloading problem pool...")
            toast.info("Reloading problem pool... This may take a few minutes, and cause some errors for certain lessons.", {
                autoClose: false,
                toastId: "reload-start"
            });

            const res = await fetch("http://localhost:4000/api/reload-problems", { method: "POST" });

            if (!res.ok) throw new Error("Failed to reload.");
            console.log("finished reloading problem pool!")
            toast.dismiss("reload-start");
            toast.success("Problem pool updated! Reloading in 5 seconds...", {
                autoClose: 5000
            });
            // Wait 5 seconds
            await new Promise(resolve => setTimeout(resolve, 5000));
            // Hard reload so the new problem pool JSON is fetched
            window.location.reload(true);
        } catch (err) {
            console.error("Reload failed:", err);
            alert("Failed to reload problem pool.");
        }
    };


    render() {
        const { translate } = this.props;
        const { classes, courseNum } = this.props;
        const selectionMode = courseNum == null ? "course" : "lesson"
        const { showPopup } = this.state;

        if (selectionMode === "lesson" && courseNum >= this.coursePlans.length) {
            return <Box width={'100%'} textAlign={'center'} pt={4} pb={4}>
                <Typography variant={'h3'}>Course <code>{courseNum}</code> is not valid!</Typography>
            </Box>
        }

        return (
            <>
                <div>
                    <Grid
                        container
                        spacing={0}
                        direction="column"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Box width="75%" maxWidth={1500} role={"main"}>
                            <center>
                                {this.isPrivileged
                                    ? <h1>{translate('lessonSelection.welcomeInstructor')}</h1>
                                    : <h1>{translate('lessonSelection.welcomeTo')} {SITE_NAME.replace(/\s/, "")}!</h1>
                                }

                                <h2>{translate('lessonSelection.select')} {selectionMode === "course" ? translate('lessonSelection.course') : translate('lessonSelection.lessonplan')}</h2>
                                {this.isPrivileged
                                    && <h4>(for {this.user.resource_link_title})</h4>
                                }
                                {
                                    IS_STAGING_OR_DEVELOPMENT && <BuildTimeIndicator/>
                                }
                            </center>
                            <Divider/>
                            <Spacer/>
                            <Grid container spacing={3}>
                                {selectionMode === "course"
                                    ? this.coursePlans
                                        .map((course, i) =>
                                            <Grid item xs={12} sm={6} md={4} key={course.courseName}>
                                                <center>
                                                    <Paper className={classes.paper}>
                                                        <h2 style={{
                                                            marginTop: "5px",
                                                            marginBottom: "10px"
                                                        }}>{course.courseName}</h2>
                                                        <IconButton aria-label={`View Course ${i}`}
                                                            aria-roledescription={`Navigate to course ${i}'s page to view available lessons`}
                                                            role={"link"}
                                                            onClick={() => {
                                                                this.props.history.push(`/courses/${i}`)
                                                            }}>
                                                            <img
                                                                src={`${process.env.PUBLIC_URL}/static/images/icons/folder.png`}
                                                                width="64px"
                                                                alt="folderIcon"/>
                                                        </IconButton>
                                                    </Paper>
                                                </center>
                                            </Grid>
                                        )
                                    : this.coursePlans[this.props.courseNum].lessons.map((lesson, i) => {
                                        return (
                                            <Grid item xs={12} sm={6} md={4} key={i}>
    <center>
      <Paper className={classes.paper} style={{ position: 'relative' }}>
        {/* top-right “view all problems” button */}
        <IconButton
          size="small"
          style={{ position: 'absolute', top: 8, right: 8 }}
          aria-label={`View all problems for lesson ${lesson.id}`}
          onClick={() => this.props.history.push(`/lessons/${lesson.id}/problems`)}
        >
          <MenuBookIcon fontSize="small" />
        </IconButton>

        <h2 style={{ marginTop: 5, marginBottom: 10 }}>
          {lesson.name.replace(/##/g, "")}
        </h2>
        <h3 style={{ marginTop: 5 }}>{lesson.topics}</h3>

        <Box display="inline-flex" gap={2}>
            <Button
                variant="contained"
                color="primary"
                className={classes.button}
                size="small"
                onClick={() => this.props.history.push(`/lessons/${lesson.id}`)}
            >
            {translate('lessonSelection.onlyselect')}
            </Button>

            <Button
                variant="contained"
                color="secondary"
                className={classes.button}
                size="small"
                onClick={() => this.props.history.push(`/new/problems/${this.props.courseNum}/${lesson.id}`)}
            >
            Add Problem
            </Button>
        </Box>
      </Paper>
    </center>
  </Grid>
                                        )
                                    })
                                }
                            </Grid>
                            <Spacer/>
                        </Box>
                    </Grid>
                    <Spacer/>
                    <Grid container spacing={2} justifyContent="center">
                        {!this.isPrivileged && (
                            <>
                                {/* Existing reset-progress button */}
                                <Grid item xs={12} sm="auto" key={2}>
                                    {this.state.preparedRemoveProgress ? (
                                        <Button
                                            className={classes.button}
                                            style={{ width: "100%" }}
                                            size="small"
                                            onClick={this.removeProgress}
                                            disabled={this.state.removedProgress}
                                        >
                                            {this.state.removedProgress
                                                ? translate("lessonSelection.reset")
                                                : translate("lessonSelection.aresure")}
                                        </Button>
                                    ) : (
                                        <Button
                                            className={classes.button}
                                            style={{ width: "100%" }}
                                            size="small"
                                            onClick={this.prepareRemoveProgress}
                                            disabled={this.state.preparedRemoveProgress}
                                        >
                                            {translate("lessonSelection.resetprogress")}
                                        </Button>
                                    )}
                                </Grid>

                                {/* Reload Problem Pool button */}
                                <Grid item xs={12} sm="auto" key={4}>
                                    <Button
                                        className={classes.button}
                                        style={{ width: "100%" }}
                                        size="small"
                                        onClick={this.reloadProblemPool}
                                    >
                                        Reload Problems
                                    </Button>
                                </Grid>

                                {/* Add course button */}
                                {selectionMode === "course" ? (
                                    <Grid item xs={12} sm="auto" key={5}>
                                        <Button
                                            className={classes.button}
                                            style={{ width: "100%" }}
                                            size="small"
                                            onClick={() => this.props.history.push(`/new/courses`)}
                                        >
                                            Add new course
                                        </Button>
                                    </Grid>
                                ) : <Grid item xs={12} sm="auto" key={5}>
                                        <Button
                                            className={classes.button}
                                            style={{ width: "100%" }}
                                            size="small"
                                            onClick={() => this.props.history.push(`/new/lessons/${this.props.courseNum}`)}
                                        >
                                            Add new lesson
                                        </Button>
                                    </Grid>
                                }
                            </>
                        )}
                    </Grid>
                    <Spacer/>
                </div>
                <footer>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                        <div style={{ marginLeft: 20, fontSize: 16 }}>
                            {SHOW_COPYRIGHT && <>© {new Date().getFullYear()} {SITE_NAME}</>}
                        </div>
                        <div style={{ display: "flex", flexGrow: 1, marginRight: 20, justifyContent: "flex-end" }}>
                            <IconButton aria-label="about" title={`About ${SITE_NAME}`}
                                onClick={this.togglePopup}>
                                <HelpOutlineOutlinedIcon htmlColor={"#000"} style={{
                                    fontSize: 36,
                                    margin: -2
                                }}/>
                            </IconButton>
                        </div>
                        <Popup isOpen={showPopup} onClose={this.togglePopup}>
                            <About />
                        </Popup>
                    </div>
                </footer>
            </>
        )
    }
}

export default withStyles(styles)(withTranslation(LessonSelection));
