const fs = require("fs");
const path = "app/(app)/wearables-setup/page.tsx";
let s = fs.readFileSync(path, "utf8");

// 1. Remove errant span - use flexible match for quote chars and whitespace
s = s.replace(
  /\{t\("detail\.wearablesSetup\.samsungStep4"\)\}\s*<span[^>]*>[\s\S]*?Connect Apple Health[\s\S]*?<\/span>\s*<\/li>/,
  '{t("detail.wearablesSetup.samsungStep4")}</li>'
);

// 2. Remove duplicate Samsung section
const firstSamsung = s.indexOf("        {/* Samsung / Android section */}");
const secondSamsung = s.indexOf("        {/* Samsung / Android section */}", firstSamsung + 5);
const otherSection = s.indexOf("        {/* Other devices section */}", secondSamsung);
if (secondSamsung !== -1 && otherSection !== -1) {
  s = s.slice(0, secondSamsung) + "\n\n        " + s.slice(otherSection);
}

fs.writeFileSync(path, s);
console.log("Done");
