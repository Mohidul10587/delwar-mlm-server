import { User } from "../app/user/model";
import bcrypt from "bcryptjs";

export const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: "superadmin" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("01700000000", 10);
      const admin = await User.create({
        name: "Super Admin",
        phone: "01700000000",
        username: "01700000000",
        password: hashedPassword,
        role: "superadmin",
        isActive: true,
        permissions: [],
      });
      console.log(`✅ Super Admin created — username: ${admin.username}, password: 01700000000`);
    }
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
  }
};
