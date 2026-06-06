const fs = require("fs");
const path = require("path");

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// Get module names from command line arguments
const moduleNames = process.argv.slice(2);

if (moduleNames.length === 0) {
  console.error("❌ Please provide at least one module name.");
  process.exit(1);
}

const baseDir = path.join(__dirname, "../src/app");
const indexFilePath = path.join(__dirname, "../src/index.ts");

moduleNames.forEach((moduleName) => {
  const capitalizedModuleName = capitalize(moduleName);
  const moduleLower = moduleName.charAt(0).toLowerCase() + moduleName.slice(1);

  const moduleDir = path.join(baseDir, moduleLower);

  if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir, { recursive: true });
  }

  //================ model.ts ======================
  const modelContent = `
import mongoose, { Schema, model, Document } from "mongoose";

interface I${capitalizedModuleName} extends Document {
  title: {en:string,bn:string};
  img:string;
}

const ${capitalizedModuleName}Schema = new Schema<I${capitalizedModuleName}>({
  title: { 
    en: { type: String, required: true },
    bn: { type: String }
  },
  img: { type: String },
}, { timestamps: true });

${capitalizedModuleName}Schema.index({ "title.en": "text" });

export const ${capitalizedModuleName} = model<I${capitalizedModuleName}>("${capitalizedModuleName}", ${capitalizedModuleName}Schema);
`;

  fs.writeFileSync(path.join(moduleDir, `model.ts`), modelContent);

  //================ validation.ts ======================
  const validationContent = `
import { z } from "zod";

export const create${capitalizedModuleName}Schema = z.object({
  title: z.object({
    en: z.string().min(1, { message: JSON.stringify({ en: "Title (English) is required", bn: "শিরোনাম (ইংরেজি) প্রয়োজন" }) }),
    bn: z.string().optional()
  }),
  img: z.string().optional()
});

export const update${capitalizedModuleName}Schema = create${capitalizedModuleName}Schema.partial();
`;

  fs.writeFileSync(path.join(moduleDir, `validation.ts`), validationContent);

  const controllerContent = `
import { Request, Response, NextFunction } from "express";
import { ${capitalizedModuleName} as Model } from "./model";

//===================== Admin Controllers =====================

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await Model.create(req.body);
    res.status(201).json({ message: { en: "${capitalizedModuleName} created successfully!", bn: "${capitalizedModuleName} সফলভাবে তৈরি হয়েছে!" }, item });
  } catch (error: any) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const item = await Model.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: { en: "${capitalizedModuleName} not found.", bn: "${capitalizedModuleName} পাওয়া যায়নি।" } });
    res.status(200).json({ message: { en: "${capitalizedModuleName} updated successfully!", bn: "${capitalizedModuleName} সফলভাবে আপডেট হয়েছে!" }, item });
  } catch (error: any) {
    next(error);
  }
};

export const allForAdminIndex = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await Model.find().select("title").sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error: any) {
    next(error);
  }
};

export const singleForEdit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await Model.findOne({ _id: req.params.id });
    res.status(200).json(item);
  } catch (error: any) {
    next(error);
  }
};

export const deleteById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const item = await Model.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ message: { en: "${capitalizedModuleName} not found.", bn: "${capitalizedModuleName} পাওয়া যায়নি।" } });
    res.status(200).json({ message: { en: "${capitalizedModuleName} deleted successfully!", bn: "${capitalizedModuleName} সফলভাবে মুছে ফেলা হয়েছে!" } });
  } catch (error: any) {
    next(error);
  }
};

// ================== User Controllers ======================

export const allForUserIndex = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await Model.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error: any) {
    next(error);
  }
};

export const forUserDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await Model.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: { en: "Oops! ${capitalizedModuleName} not found.", bn: "ওহ! ${capitalizedModuleName} পাওয়া যায়নি।" }, item: null });
    }
    res.status(200).json(item);
  } catch (error: any) {
    next(error);
  }
};
`;

  fs.writeFileSync(path.join(moduleDir, `controller.ts`), controllerContent);

  //=================== routes.ts =======================
  const routesContent = `
import { Router } from "express";
import {
  allForAdminIndex,
  create,
  singleForEdit,
  update,
  allForUserIndex,
  forUserDetails,
  deleteById
} from "./controller";
import { verifyAdmin, verifyUser } from "../../middleware/auth";



const router = Router();

//====================== For User ======================
// router.get("/allForUserIndex", allForUserIndex);
// router.get("/forUserDetails/:id", forUserDetails);

//====================== For Admin =====================
router.post("/create", verifyAdmin, create);
// router.get("/allForAdminIndex", verifyAdmin, allForAdminIndex);
// router.get("/singleForEdit/:id", verifyAdmin, singleForEdit);
// router.put("/update/:id", verifyAdmin, update);
// router.delete("/delete/:id", verifyAdmin, deleteById);

export default router;
`;

  fs.writeFileSync(path.join(moduleDir, `routes.ts`), routesContent);

  //================== update index.ts ===================
  const routeImportStatement = `import ${moduleLower}Routes from "./app/${moduleLower}/routes";`;
  const routeUsageStatement = `app.use("/${moduleLower}", ${moduleLower}Routes);`;

  let indexFileContent = fs.readFileSync(indexFilePath, "utf-8");

  if (!indexFileContent.includes(routeImportStatement)) {
    const importInsertPos = indexFileContent.indexOf("// ImportRoutes");
    if (importInsertPos !== -1) {
      indexFileContent =
        indexFileContent.slice(0, importInsertPos + 15) +
        `\n${routeImportStatement}` +
        indexFileContent.slice(importInsertPos + 15);
    }

    const useRoutesInsertPos = indexFileContent.indexOf("// UseRoutes");
    if (useRoutesInsertPos !== -1) {
      indexFileContent =
        indexFileContent.slice(0, useRoutesInsertPos + 12) +
        `\n${routeUsageStatement}` +
        indexFileContent.slice(useRoutesInsertPos + 12);
    }

    indexFileContent = indexFileContent.replace(/\n{2,}/g, "\n");
    fs.writeFileSync(indexFilePath, indexFileContent);
    console.log(`✅ Added route for "${moduleName}" in index.ts`);
  } else {
    console.log(`⚠️ Route for "${moduleName}" already exists in index.ts`);
  }

  console.log(`✅ Module "${moduleName}" created successfully!`);
});

console.log("✅ All modules have been created successfully.");
