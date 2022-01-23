import React from "react";
import { useState } from "react";
import "./HexModule.css";
import { Card, Button, Row, Col, Form, ProgressBar } from "react-bootstrap";
import hexToArrayBuffer from "hex-to-array-buffer";
import modules from "../modules";

const folders = distinctArray(
   modules.map((x) => ({
      folderKey: x.folderKey,
      folderName: x.folderName,
   }))
);

let hexData = "";

function buf2hex(buffer) {
   // buffer is an ArrayBuffer
   return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function folderMatching(hexData) {
   try {
      let matchedFolder = [];

      if (!hexData) return [];

      for (let f of folders) {
         if (hexData.includes(f.folderKey)) matchedFolder.push(f.folderName);
      }

      return matchedFolder;
   } catch (error) {
      return [];
   }
}

function getAvailableModulesByFolderName(folderName) {
   try {
      const availableModules = modules.filter((x) => x.folderName === folderName);
      return availableModules;
   } catch (error) {
      return [];
   }
}

function checkingModuleStatus(hexData, module) {
   try {
      let isReady = true;
      const cloneHex = hexData.toLowerCase();
      //Rule 1: module.strings must be equal to module.RPM
      if (module.value.strings.length !== module.value.RPM.length) isReady = false;

      //Rule 2: all strings in module.strings must be found in hexData
      let count = 0;
      for (let s of module.value.strings) {
         if (cloneHex.includes(s.join("").toLowerCase()) === false) {
            isReady = false;
         } else {
            count++;
         }
      }
      console.log(`Module Name: ${module.folderName}-${module.moduleName}`, " - ", count, "/", module.value.strings.length, " - isReady: ", isReady);
      return { moduleName: module.moduleName, count: `${count}"/"${module.value.strings.length}`, isReady };
   } catch (error) {
      return { moduleName: "error", count: "0/0", isReady: false };
   }
}

function replacingProcess(hexData, module) {
   try {
      let copyHex = hexData.toLowerCase();
      if (!hexData) return "";
      if (!(module && module.moduleName && module.value.strings.length > 0 && module.value.RPM.length > 0)) return "";

      let count = 0;

      module.value.strings.forEach((s, i) => {

         const searchString = s.join("").toLowerCase()
         const replaceString = module.value.RPM[i][0].join("").toLowerCase()

         if (copyHex.includes(searchString)) {
            copyHex = copyHex.replace(searchString, replaceString);
            console.log("searchString",searchString)
            console.log("replaceString",replaceString)
            count++;
         }
      });

      console.log(`Replace ${module.folderName}-${module.moduleName}: `, count, "/", module.value.strings.length);
      return copyHex;
   } catch (error) {
      return "";
   }
}

//support function

function distinctArray(array) {
   try {
      let distinct = [];

      for (let a of array) {
         let isExist = false;
         for (let d of distinct) {
            if (shallowEqual(a, d)) {
               isExist = true;
               break;
            }
         }
         if (isExist === false) {
            distinct.push(a);
         }
      }
      return distinct;
   } catch (error) {
      return [];
   }
}
function shallowEqual(object1, object2) {
   const keys1 = Object.keys(object1);
   const keys2 = Object.keys(object2);
   if (keys1.length !== keys2.length) {
      return false;
   }
   for (let key of keys1) {
      if (object1[key] !== object2[key]) {
         return false;
      }
   }
   return true;
}

const HexModule = () => {
   const [fileMatched, setFileMatched] = useState("Checking...");
   const [availableModules, setAvailableModules] = useState([]);

   const [loadingPercentage, setLoadingPercentage] = useState(0);

   const [downloadDataArray, setDownloadDataArray] = useState([]);

   let [selectedModules, setSelectedModules] = useState([]);

   const clearAll = () => {
      setFileMatched("Checking...");
      setAvailableModules([]);
      //setLoadingPercentage(0)
      setDownloadDataArray([]);
      setSelectedModules([]);
      hexData = "";
   };

   const handleFileChange = (e) => {
      clearAll();
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => {
         //Step1:
         let data = reader.result;
         hexData = buf2hex(data);

         //Step2:
         const matchedFolders = folderMatching(hexData);

         if (matchedFolders.length <= 0) {
            setFileMatched("Does not found any matched folder!");
         } else {
            setFileMatched(matchedFolders.join(" ; ").toString());

            //Step3:
            let aModules = [];
            for (let folder of matchedFolders) {
               const availModules = getAvailableModulesByFolderName(folder);

               if (availModules.length > 0) {
                  for (let m of availModules) {
                     m.status = checkingModuleStatus(hexData, m);
                  }

                  aModules.push({
                     folderName: folder,
                     modules: availModules,
                  });
               }
            }

            setAvailableModules(aModules);
         }
      };
      reader.onerror = () => {
         console.log("file error", reader.error);
      };
   };

   const handleSwitchChange = (e) => {
      const isChecked = e.currentTarget.checked;
      const id = e.currentTarget.id;

      setLoadingPercentage(0);
      setDownloadDataArray([]);

      if (isChecked) {
         setSelectedModules((prev) => [...prev, { id, isChecked }]);
      } else {
         setSelectedModules((prev) => {
            let newSelectedModules = [...prev];
            const index = selectedModules.indexOf((x) => x.id === id);
            newSelectedModules.splice(index, 1);
            return newSelectedModules;
         });
      }
   };

   const handleConvertOnClick = (e) => {
      setDownloadDataArray([]);
      let loading = 1;

      for (let m of selectedModules) {
         const id = m.id;

         console.log("--- Replacing Process ---");

         const folderName = id.split("-")[0];
         const moduleName = id.split("-")[1];

         const replacingFolder = availableModules.find((x) => x.folderName === folderName);

         if (!replacingFolder) return null;

         const replacingModule = replacingFolder.modules.find((x) => x.moduleName === moduleName);

         const newHex = replacingProcess(hexData, replacingModule);

         loading++;
         setLoadingPercentage((100 / selectedModules.length) * loading);

         setDownloadDataArray((prev) => [...prev, { folderName: replacingModule.folderName, moduleName: replacingModule.moduleName, newHex }]);
      }
   };

   const handleDownloadButton = (e) => {
      try {
         const id = e.currentTarget.id;

         if (id.includes("download-button") === false) return { error: `Download button on Click error with id=${id}` };

         const folderName = id.split("-")[0];
         const moduleName = id.split("-")[1];

         const newValue = downloadDataArray.find((x) => x.folderName === folderName && x.moduleName === moduleName);

         if (!newValue) return { error: `Can't find correct converted data with id = ${id}` };

         const buffer = hexToArrayBuffer(newValue.newHex);

         const element = document.createElement("a");
         element.id = `${id}-data-value`;
         var file = new Blob([buffer], { type: "application/octet-stream" });
         element.href = URL.createObjectURL(file);
         element.download = `${folderName}_${moduleName}_${new Date().getTime()}`;
         document.body.appendChild(element); // Required for this to work in FireFox
         element.click();
         document.body.removeChild(element);
      } catch (error) {
         console.log({ error: `handleDownloadButton error!`, message: error });
         return null;
      }
   };

   return (
      <div className="HexModuleContainer">
         <Card border="primary" style={{}}>
            <Card.Header style={{ fontSize: "25px", fontWeight: "700", textAlign: "center" }}>Hex Module</Card.Header>
            <Card.Body>
               <Card>
                  <Card.Body>
                     <Card border="info" style={{}}>
                        <Card.Header className="step-header">Step 1: Select File</Card.Header>
                        <Card.Body>
                           <Form.Group as={Row} controlId="formFile" className="mb-3">
                              <Form.Label column sm="2">
                                 Open File
                              </Form.Label>
                              <Col sm="10">
                                 <Form.Control type="file" onChange={(e) => handleFileChange(e)} />
                              </Col>
                           </Form.Group>
                        </Card.Body>
                     </Card>
                     <br />
                     <Card border="info">
                        <Card.Header className="step-header">Step 2: Folder Matching</Card.Header>
                        <Card.Body>
                           <Row>
                              <Col sm="2">
                                 <Form.Label>Folders</Form.Label>
                              </Col>
                              <Col sm="10">
                                 <Form.Control type="text" placeholder={fileMatched} readOnly />
                              </Col>
                           </Row>
                        </Card.Body>
                     </Card>
                     <br />

                     <Card border="info">
                        <Card.Header className="step-header">Step 3: Available Modules</Card.Header>
                        <Card.Body style={{ textAlign: "left" }}>
                           {availableModules.map((folder, index) => (
                              <div key={index}>
                                 <Row style={{ display: "block", margin: "10px" }}>
                                    Folder: <strong>{folder.folderName}</strong>
                                 </Row>
                                 {folder.modules.map((mo, index2) => (
                                    <Row key={index2}>
                                       <Col sm="1"></Col>
                                       <Col sm="2">
                                          <Form.Label>{mo.moduleName}</Form.Label>
                                       </Col>
                                       <Col sm="1">
                                          <Form.Check
                                             type="switch"
                                             id={`${folder.folderName}-${mo.moduleName}-${index2}`}
                                             disabled={!mo.status.isReady}
                                             onChange={(e) => handleSwitchChange(e)}
                                          />
                                       </Col>
                                       <Col sm="8">
                                          <Form.Label>Status:&nbsp;</Form.Label>
                                          <Form.Label
                                             style={mo.status.isReady ? { color: "green", fontWeight: "bold" } : { color: "red", fontWeight: "bold" }}
                                          >
                                             {mo.status.isReady === true ? "Ready" : "Failed"}
                                          </Form.Label>
                                       </Col>
                                    </Row>
                                 ))}
                              </div>
                           ))}
                        </Card.Body>
                     </Card>

                     <br />
                     <Card border="info">
                        <Card.Header className="step-header">Step 4: Processing</Card.Header>
                        <Card.Body>
                           <Row>
                              <Col sm="2">
                                 <Button
                                    variant="danger"
                                    type="button"
                                    style={selectedModules.length > 0 ? { display: "block" } : { display: "none" }}
                                    onClick={handleConvertOnClick}
                                 >
                                    Convert
                                 </Button>
                              </Col>
                              <Col sm="10">
                                 <ProgressBar
                                    animated
                                    variant="success"
                                    now={loadingPercentage}
                                    style={selectedModules.length > 0 ? { display: "flex", padding: "0px" } : { display: "none", padding: "0px" }}
                                 />
                              </Col>
                           </Row>
                        </Card.Body>
                        <Card.Footer>
                           {downloadDataArray.map((d, index) => (
                              <Row style={{ margin: "10px" }} key={index}>
                                 <Col style={{ textAlign: "right" }}>
                                    <Button
                                       variant="primary"
                                       type="button"
                                       id={`${d.folderName}-${d.moduleName}-download-button`}
                                       onClick={handleDownloadButton}
                                    >
                                       Download for {d.folderName}-{d.moduleName}
                                    </Button>
                                 </Col>
                              </Row>
                           ))}
                        </Card.Footer>
                     </Card>
                  </Card.Body>
               </Card>
            </Card.Body>
         </Card>
      </div>
   );
};

export default HexModule;
