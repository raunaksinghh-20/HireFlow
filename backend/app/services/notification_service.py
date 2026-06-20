import logging
import os
import smtplib
import urllib.request
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

from app.config.settings import settings

logger = logging.getLogger(__name__)

# Ensure logs directory exists
LOGS_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True, parents=True)
LOG_FILE_PATH = LOGS_DIR / "email_notifications.log"


def _log_email_locally(to_email: str, subject: str, text_content: str, html_content: str):
    """Fallback: Log email contents to a local log file for developer debugging."""
    try:
        log_entry = (
            f"========================================================================\n"
            f"TIMESTAMP: {urllib.request.pathname2url('')}\n"
            f"TO: {to_email}\n"
            f"FROM: {settings.SMTP_FROM}\n"
            f"SUBJECT: {subject}\n"
            f"------------------------------------------------------------------------\n"
            f"TEXT CONTENT:\n{text_content}\n"
            f"========================================================================\n\n"
        )
        with open(LOG_FILE_PATH, "a") as f:
            f.write(log_entry)
        
        logger.info(f"Mock email logged to {LOG_FILE_PATH} for {to_email}")
        print(f"\n[MOCK EMAIL SENT] to: {to_email} | Subject: {subject}\nSee local log at: {LOG_FILE_PATH}\n")
    except Exception as e:
        logger.error(f"Failed to log email locally: {e}")


def _send_via_smtp(to_email: str, subject: str, text_content: str, html_content: str) -> bool:
    """Send mail via standard SMTP library."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email

        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        msg.attach(part1)
        msg.attach(part2)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_PORT == 587:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
        
        logger.info(f"Email successfully sent via SMTP to {to_email}")
        return True
    except Exception as e:
        logger.error(f"SMTP email sending failed to {to_email}: {e}")
        return False


def _send_via_resend(to_email: str, subject: str, html_content: str) -> bool:
    """Send email via Resend REST API using urllib to avoid heavy SDK dependencies."""
    try:
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Resend onboarding emails are restricted to the default from address
        from_address = settings.SMTP_FROM if "noreply@hireflow" not in settings.SMTP_FROM else "onboarding@resend.dev"
        
        payload = {
            "from": f"HireFlow AI <{from_address}>",
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        
        with urllib.request.urlopen(req) as response:
            if response.status in (200, 201):
                logger.info(f"Email sent via Resend API to {to_email}")
                return True
            
        return False
    except Exception as e:
        logger.error(f"Resend API email sending failed to {to_email}: {e}")
        return False


def _send_via_sendgrid(to_email: str, subject: str, html_content: str) -> bool:
    """Send email via SendGrid REST API using urllib."""
    try:
        url = "https://api.sendgrid.com/v3/mail/send"
        headers = {
            "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": settings.SMTP_FROM, "name": "HireFlow AI"},
            "subject": subject,
            "content": [{"type": "text/html", "value": html_content}]
        }
        
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        
        with urllib.request.urlopen(req) as response:
            if response.status in (200, 202):
                logger.info(f"Email sent via SendGrid API to {to_email}")
                return True
            
        return False
    except Exception as e:
        logger.error(f"SendGrid API email sending failed to {to_email}: {e}")
        return False


def send_email(to_email: str, subject: str, text_content: str, html_content: str):
    """
    Core dispatcher. Checks configuration and sends email using SendGrid, Resend, SMTP,
    or falls back to local logging.
    """
    if not to_email:
        logger.warning("No recipient email provided, skipping notification.")
        return

    # 1. Resend API
    if settings.RESEND_API_KEY:
        success = _send_via_resend(to_email, subject, html_content)
        if success:
            return

    # 2. SendGrid API
    if settings.SENDGRID_API_KEY:
        success = _send_via_sendgrid(to_email, subject, html_content)
        if success:
            return

    # 3. SMTP
    if settings.SMTP_HOST:
        success = _send_via_smtp(to_email, subject, text_content, html_content)
        if success:
            return

    # 4. Fallback to file logging if no active configuration
    _log_email_locally(to_email, subject, text_content, html_content)


# ── Preset Triggers ──────────────────────────────────────────────────────────

def send_screening_completed_email(candidate_email: str, candidate_name: str, job_title: str, ats_score: int):
    """Notify candidate that screening is complete and a score is generated."""
    subject = f"Screening Complete: {job_title} — HireFlow AI"
    text = (
        f"Hi {candidate_name},\n\n"
        f"Your resume screening for the {job_title} position is complete. "
        f"We've analyzed your skills and experience against our requirements.\n\n"
        f"Next Steps: A recruiter will contact you soon regarding the interview scheduling.\n\n"
        f"Best regards,\nHireFlow Recruitment Team"
    )
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eeece7;">
        <h2 style="color: #17171c; font-family: 'Space Grotesk', sans-serif;">Screening Update</h2>
        <p>Hi {candidate_name},</p>
        <p>We have completed the resume screening step for the <strong>{job_title}</strong> position.</p>
        <p>Your qualifications have been matched against our requirements, and our team will review the results shortly.</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #eeece7; border-radius: 4px;">
            <strong>Next Stage:</strong> Adaptive AI Interview. Keep an eye out for a scheduling invitation.
        </div>
        <p style="color: #6e6e73; font-size: 12px; margin-top: 30px;">Sent automatically by HireFlow AI Recruitment System.</p>
    </div>
    """
    send_email(candidate_email, subject, text, html)


def send_interview_invitation_email(candidate_email: str, candidate_name: str, job_title: str, resume_id: str, job_id: str):
    """Notify candidate that they are invited to schedule/take an interview."""
    # Build actual frontend link for the candidate room
    link = f"http://localhost:5173/interviews?resumeId={resume_id}&jobId={job_id}"
    
    subject = f"Invitation to AI Interview: {job_title} — HireFlow AI"
    text = (
        f"Hi {candidate_name},\n\n"
        f"You have been invited to complete a stateful AI-powered technical interview for the {job_title} role.\n\n"
        f"Please click the link below to set up your room (voice or text chat):\n"
        f"{link}\n\n"
        f"The interview will take about 15 minutes. Ensure your microphone works if selecting voice mode.\n\n"
        f"Best regards,\nHireFlow Recruitment Team"
    )
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eeece7;">
        <h2 style="color: #17171c; font-family: 'Space Grotesk', sans-serif;">AI Interview Invitation</h2>
        <p>Hi {candidate_name},</p>
        <p>You have been selected to proceed to the next round: the <strong>AI-Powered Adaptive Interview</strong> for the <strong>{job_title}</strong> position.</p>
        <p>This session will adapt question difficulty based on your answers in real time. You can choose either <strong>text input</strong> or <strong>voice conversation</strong>.</p>
        <div style="margin: 30px 0; text-align: center;">
            <a href="{link}" style="background-color: #17171c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 32px; font-weight: bold; display: inline-block;">
                Enter Interview Room
            </a>
        </div>
        <p style="color: #6e6e73; font-size: 12px; margin-top: 30px;">Direct Link: <a href="{link}">{link}</a></p>
    </div>
    """
    send_email(candidate_email, subject, text, html)


def send_interview_completed_email(recruiter_email: str, candidate_name: str, job_title: str, overall_score: float):
    """Notify recruiter that a candidate completed their interview and evaluation is ready."""
    subject = f"Interview Completed: {candidate_name} — {job_title}"
    text = (
        f"Hi Recruiter,\n\n"
        f"Candidate {candidate_name} has completed their AI-powered interview for the {job_title} position.\n\n"
        f"Interview Overall Score: {overall_score}/100\n"
        f"A full structured evaluation report, transcript, and strengths/red flags analysis is ready for review in the dashboard.\n\n"
        f"Best regards,\nHireFlow AI Notifications"
    )
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eeece7;">
        <h2 style="color: #17171c; font-family: 'Space Grotesk', sans-serif;">Interview Evaluation Ready</h2>
        <p>Hi Recruiter,</p>
        <p>Candidate <strong>{candidate_name}</strong> has completed their interview session for <strong>{job_title}</strong>.</p>
        <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #17171c; background-color: #fcfcfc;">
            <strong>Overall Candidate Score:</strong> {overall_score}/100
        </div>
        <p>The structured evaluation breakdown, strengths, concern flags, and direct transcript turns are ready for review.</p>
        <div style="margin: 25px 0;">
            <a href="http://localhost:5173/dashboard" style="background-color: #17171c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 32px; font-size: 14px; font-weight: bold;">
                Go to Dashboard
            </a>
        </div>
        <p style="color: #6e6e73; font-size: 12px; margin-top: 30px;">Sent automatically by HireFlow AI Recruitment System.</p>
    </div>
    """
    send_email(recruiter_email, subject, text, html)
