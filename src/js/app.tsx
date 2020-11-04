import "react";
import React from "react";
import ReactDOM from "react-dom";

class App extends React.Component
{
    public render() {
        return <>
            <h1>Compressor Visualizer</h1>

            <p>(audio input here)</p>
            <p>(output here)</p>

            <fieldset>
                <legend>Controls</legend>

                <p>threshold</p>
                <p>ratio</p>
                <p>knee</p>

                <p>attack</p>
                <p>release</p>
                <p>gain</p>
            </fieldset>
        </>;
    }
}

const app = document.getElementById("app");
ReactDOM.render(<App />, app);