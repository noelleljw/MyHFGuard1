// src/lib/pdf.ts
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Generate a PDF for a patient dashboard.
 * @param patient - patient profile containing name and id.
 * @param element - HTML element containing the charts to capture.
 */
export async function generatePatientPdf(
    patient: { first_name: string; last_name: string; patient_id: string },
    element: HTMLElement
): Promise<void> {
    try {
        // Capture the element as a canvas
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "pt", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Add header with patient info
        pdf.setFontSize(14);
        pdf.text(`Patient: ${patient.first_name} ${patient.last_name}`, 40, 40);
        pdf.text(`ID: ${patient.patient_id}`, 40, 60);

        // Calculate image dimensions to fit page width
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pageWidth - 80; // margins
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        pdf.addImage(imgData, "PNG", 40, 80, imgWidth, imgHeight);

        pdf.save(`Patient_${patient.patient_id}.pdf`);
    } catch (error) {
        console.error("PDF generation error:", error);
    }
}
