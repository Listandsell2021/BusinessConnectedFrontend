import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useTheme } from '../src/contexts/ThemeContext';
import ThemeToggle from '../src/components/ui/ThemeToggle';
import LanguageToggle from '../src/components/ui/LanguageToggle';

export default function PrivacyPolicy() {
  const { isGerman } = useLanguage();
  const { mounted, isDark } = useTheme();

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{isGerman ? 'Datenschutzrichtlinie' : 'Privacy Policy'} - Business Connected</title>
        <meta name="description" content={isGerman ? 'Datenschutzrichtlinie von Business Connected' : 'Privacy Policy of Business Connected'} />
      </Head>

      <div
        className="min-h-screen transition-all duration-500"
        style={{
          backgroundColor: 'var(--theme-bg)',
          color: 'var(--theme-text)'
        }}
      >
        {/* Header */}
        <header className="relative z-10 border-b backdrop-blur-lg" style={{
          borderColor: 'var(--theme-border)',
          backgroundColor: 'rgba(var(--theme-card-bg-rgb), 0.8)'
        }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Logo */}
              <motion.div
                className="flex items-center space-x-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Link href="/" className="hover:opacity-75 transition-opacity">
                  <Image src="/business-connected-logo.svg" alt="Business Connected" width={180} height={50} priority />
                </Link>
              </motion.div>

              {/* Controls */}
              <motion.div
                className="flex items-center space-x-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <ThemeToggle />
                <LanguageToggle />
              </motion.div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-lg p-8 backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--theme-border)'
            }}
          >
            {isGerman ? (
              <>
                <h1 className="text-4xl font-bold mb-2">Datenschutzrichtlinie</h1>
                <p className="text-gray-500 mb-8">Zuletzt aktualisiert: 8. Januar 2026</p>

                <p className="mb-6 leading-relaxed">Wenn Sie Informationen an uns über diese Website übermitteln, sind wir verpflichtet, Ihre Privatsphäre zu schützen und Transparenz darüber zu gewährleisten, wie wir Ihre persönlichen Daten behandeln. Diese Datenschutzrichtlinie erklärt, welche Informationen wir sammeln, wie wir diese verwenden und welche Rechte Sie bezüglich Ihrer Daten haben.</p>

                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-3">1. Formulare und Kommentare</h2>
                    <p className="mb-4">Wenn Sie die Sicherheitsservice-Formulare oder Kontaktinformationen über unsere Website übermitteln, erfassen wir die persönlichen Daten, die Sie bereitstellen, einschließlich Ihres Namens, Ihrer E-Mail-Adresse, Ihrer Telefonnummer, Ihrer Unternehmensinformationen und Projektdetails. Wir verwenden diese Informationen ausschließlich zur Bearbeitung Ihrer Anfrage und zur Verbindung mit geeigneten Partnern oder zur Bereitstellung angefordeter Informationen.</p>
                    <p>Wenn Sie dies aktivieren, wird Ihr Profilbild (Avatar) möglicherweise über Gravatar angezeigt, einen Dienst eines Drittanbieters. Gravatar erstellt einen gehashten Wert Ihrer E-Mail-Adresse, um Ihren Avatar abzurufen, aber Ihre E-Mail-Adresse wird nicht in unhashierter Form direkt an Gravatar weitergegeben.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">2. Medien</h2>
                    <p className="mb-4">Wenn Sie Mediendateien (Bilder, Dokumente usw.) auf unsere Plattform hochladen, beachten Sie bitte, dass diese Dateien möglicherweise vertrauliche Metadaten enthalten, einschließlich GPS-Koordinaten (EXIF-Daten). Wir empfehlen, diese Daten vor dem Hochladen zu entfernen oder zu bereinigen, da sie möglicherweise Standortinformationen oder andere persönliche Details offenbaren.</p>
                    <p>Wir ergreifen angemessene Maßnahmen, um unbefugten Zugriff auf hochgeladene Dateien zu verhindern, empfehlen jedoch, keine vertraulichen persönlichen Informationen hochzuladen.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">3. Cookies</h2>
                    <p className="mb-4">Wir verwenden Cookies und ähnliche Tracking-Technologien, um Ihr Erlebnis auf unserer Website zu verbessern. Die Arten von Cookies, die wir verwenden, sind:</p>
                    <ul className="list-disc list-inside space-y-2 mb-4 ml-2">
                      <li><strong>Session-Cookies:</strong> Wird 1 Jahr lang gespeichert, um Ihre Anmeldesitzung und Einstellungen zu erhalten</li>
                      <li><strong>Präferenz-Cookies:</strong> Wird 2 Tage lang gespeichert, um Ihre Sprach- und Anzeigeeinstellungen zu speichern</li>
                      <li><strong>Analyse-Cookies:</strong> Wird 2 Wochen lang gespeichert, um uns zu helfen, zu verstehen, wie Sie unsere Website nutzen, und die Funktionalität zu verbessern</li>
                    </ul>
                    <p>Sie können Cookie-Einstellungen über Ihre Browser-Einstellungen steuern. Das Deaktivieren von Cookies kann die Nutzung bestimmter Funktionen unserer Website beeinträchtigen.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">4. Eingebettete Inhalte</h2>
                    <p className="mb-4">Unsere Website kann eingebettete Inhalte von Drittanbieterdiensten enthalten (z. B. Karten, Videos oder Analysedienste). Diese Drittanbieterdienste können Informationen über Ihre Interaktion mit dem eingebetteten Inhalt erfassen, einschließlich Ihrer IP-Adresse und Ihres User-Agent-Informationen.</p>
                    <p>Wir sind nicht verantwortlich für die Datenschutzpraktiken dieser Drittanbieterdienste. Wir empfehlen, deren Datenschutzrichtlinien zu überprüfen, um weitere Informationen über den Umgang mit Ihren Daten zu erhalten.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">5. Weitergabe Ihrer Daten</h2>
                    <p className="mb-4">Ihre persönlichen Daten werden ohne Ihre ausdrückliche Zustimmung nicht an Dritte weitergegeben, außer in folgenden Fällen:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li><strong>Servicepartner:</strong> Wir können Ihre E-Mail-Adresse an relevante Sicherheitsdienstleister weitergeben, wenn Sie ein Clientanforderungsformular einreichen, damit sie Sie bezüglich Ihrer Anfrage kontaktieren können</li>
                      <li><strong>Passwort-Zurücksetzen:</strong> Wenn Sie ein Passwort-Zurücksetzen anfordern, wird Ihre IP-Adresse vorübergehend für Sicherheitsverifizierungszwecke verwendet</li>
                      <li><strong>Gesetzliche Anforderungen:</strong> Wir können Ihre Informationen offenbaren, wenn dies gesetzlich, regulatorisch oder durch einen Rechtsstreit erforderlich ist</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">6. Speicherdauer von Daten</h2>
                    <p className="mb-4">Wir speichern Ihre persönlichen Daten für die folgenden Zeiträume:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li><strong>Formularübermittlungen:</strong> Werden auf unbestimmte Zeit gespeichert, es sei denn, Sie fordern die Löschung an, um die laufende Kommunikation und Diensterbringung zu ermöglichen</li>
                      <li><strong>Benutzerprofildetails:</strong> Werden auf unbestimmte Zeit gespeichert, während Ihr Konto aktiv ist, oder 90 Tage nach der Kontolöschung, sofern nicht gesetzlich vorgeschrieben</li>
                      <li><strong>Anmelde-Protokolle:</strong> Werden 30 Tage lang für Sicherheitszwecke gespeichert</li>
                      <li><strong>Analysedaten:</strong> Werden 24 Monate lang gespeichert, um langfristige Trends zu verstehen</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">7. Ihre Datenschutzrechte</h2>
                    <p className="mb-4">Unter den geltenden Datenschutzgesetzen (einschließlich der Europäischen Datenschutzrichtlinie) haben Sie die folgenden Rechte bezüglich Ihrer persönlichen Daten:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li><strong>Recht auf Zugang:</strong> Sie können eine Kopie der persönlichen Daten anfordern, die wir über Sie führen</li>
                      <li><strong>Recht auf Berichtigung:</strong> Sie können die Berichtigung ungültiger oder unvollständiger Daten anfordern</li>
                      <li><strong>Recht auf Löschung:</strong> Sie können die Löschung Ihrer persönlichen Daten anfordern (vorbehaltlich bestimmter gesetzlicher Ausnahmen)</li>
                      <li><strong>Recht auf Beschränkung der Verarbeitung:</strong> Sie können anfordern, dass wir die Verwendung Ihrer Daten begrenzen</li>
                      <li><strong>Recht auf Datenportabilität:</strong> Sie können Ihre Daten in einem tragbaren Format anfordern</li>
                      <li><strong>Widerspruchsrecht:</strong> Sie können bestimmten Arten der Datenverarbeitung widersprechen</li>
                    </ul>
                    <p className="mt-4">Um eines dieser Rechte auszuüben, kontaktieren Sie uns bitte unter den nachfolgend angegebenen Kontaktdaten.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">8. Datentransfer und automatisierte Verarbeitung</h2>
                    <p className="mb-4">Um Spam und Missbrauch zu verhindern, verwenden wir automatisierte Systeme zur Analyse von Formularübermittlungen und Benutzerverhalten. Dies kann Folgendes beinhalten:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li>Mustererkennung zur Identifizierung möglicherweise betrügerischer oder Spam-Übermittlungen</li>
                      <li>Verhaltensanalyse zur Erkennung ungewöhnlicher Kontoaktivität</li>
                      <li>Automatisierte E-Mail-Verifizierung</li>
                    </ul>
                    <p className="mt-4">Wenn Ihre Übermittlung als möglicherweise Spam oder verdächtig gekennzeichnet wird, kann sie vor der Verarbeitung von unserem Team überprüft werden.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">9. Sicherheit</h2>
                    <p className="mb-4">Wir setzen branchenübliche Sicherheitsmaßnahmen ein, um Ihre persönlichen Daten zu schützen:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li><strong>SSL/TLS-Verschlüsselung:</strong> Alle Daten, die zwischen Ihrem Browser und unseren Servern übertragen werden, werden mit Secure Sockets Layer (SSL) oder Transport Layer Security (TLS) -Technologie verschlüsselt</li>
                      <li><strong>Sichere Passwörter:</strong> Passwörter werden vor der Speicherung gehasht und gesalzen</li>
                      <li><strong>Zugriffskontrolle:</strong> Der Zugriff auf persönliche Daten ist auf autorisiertes Personal beschränkt</li>
                      <li><strong>Regelmäßige Sicherheitsprüfungen:</strong> Wir überprüfen regelmäßig unsere Sicherheitsmaßnahmen</li>
                    </ul>
                    <p className="mt-4">Obwohl wir umfassende Sicherheitsmaßnahmen implementieren, ist keine Übertragungsmethode im Internet zu 100 % sicher. Sie verwenden unsere Dienste auf Ihr eigenes Risiko hin, und wir können absolute Sicherheit nicht garantieren.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">10. Änderungen dieser Datenschutzrichtlinie</h2>
                    <p className="mb-4">Wir behalten uns das Recht vor, diese Datenschutzrichtlinie jederzeit zu aktualisieren, um Änderungen in unseren Datenverarbeitungspraktiken, gesetzlichen Anforderungen oder anderen Faktoren widerzuspiegeln. Wir benachrichtigen Sie über wesentliche Änderungen, indem wir das Datum am Ende dieser Richtlinie aktualisieren und Sie in einigen Fällen per E-Mail benachrichtigen.</p>
                    <p>Ihre weitere Nutzung unserer Website nach Änderungen dieser Richtlinie gilt als Akzeptanz dieser Änderungen. Wir empfehlen, diese Richtlinie regelmäßig zu überprüfen, um informiert zu bleiben, wie wir Ihre Daten schützen.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">Kontakt</h2>
                    <p className="mb-4">Wenn Sie Fragen, Bedenken oder Anfragen bezüglich dieser Datenschutzrichtlinie oder unserer Verarbeitung Ihrer persönlichen Daten haben, kontaktieren Sie uns bitte unter:</p>
                    <p className="mb-4"><strong>E-Mail:</strong> <a href="mailto:info@businessconnected24.de" className="text-blue-600 hover:text-blue-700 underline transition-colors duration-200">info@businessconnected24.de</a></p>
                    <p>Wir sind dazu verpflichtet, auf alle Datenschutzanfragen innerhalb von 30 Tagen zu reagieren und mit Ihnen zusammenzuarbeiten, um alle Bedenken bezüglich der Verarbeitung Ihrer persönlichen Daten zu lösen.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-gray-500 mb-8">Last updated: January 8, 2026</p>

                <p className="mb-6 leading-relaxed">When you provide information to us through this website, we are committed to protecting your privacy and ensuring transparency about how we handle your personal data. This privacy policy explains what information we collect, how we use it, and your rights regarding your data.</p>

                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-3">1. Forms and Comments</h2>
                    <p className="mb-4">When you submit the security services forms or contact information through our website, we collect the personal data you provide, including your name, email address, phone number, company information, and project details. We use this information exclusively to process your request and connect you with appropriate partners or provide requested information.</p>
                    <p>If you choose to enable it, your profile picture (avatar) may be displayed using Gravatar, which is a third-party service. Gravatar creates a hashed value of your email address to retrieve your avatar, but your email address is not directly shared with Gravatar in unhashed form.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">2. Media</h2>
                    <p className="mb-4">If you upload media files (images, documents, etc.) to our platform, please be aware that these files may contain sensitive metadata, including GPS coordinates (EXIF data). We recommend removing or stripping this data before uploading, as it may reveal location information or other personal details.</p>
                    <p>We take reasonable steps to prevent unauthorized access to uploaded files, but we recommend not uploading sensitive personal information.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">3. Cookies</h2>
                    <p className="mb-4">We use cookies and similar tracking technologies to enhance your experience on our website. The types of cookies we use include:</p>
                    <ul className="list-disc list-inside space-y-2 mb-4 ml-2">
                      <li><strong>Session Cookies:</strong> Retained for 1 year to maintain your login session and preferences</li>
                      <li><strong>Preference Cookies:</strong> Retained for 2 days to remember your language and display preferences</li>
                      <li><strong>Analytics Cookies:</strong> Retained for 2 weeks to help us understand how you use our website and improve functionality</li>
                    </ul>
                    <p>You can control cookie preferences through your browser settings. Disabling cookies may affect your ability to use certain features of our website.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">4. Embedded Content</h2>
                    <p className="mb-4">Our website may contain embedded content from third-party services (such as maps, videos, or analytics services). These third-party services may collect information about your interaction with the embedded content, including your IP address and user agent information.</p>
                    <p>We are not responsible for the privacy practices of these third-party services. We recommend reviewing their privacy policies for more information about how they handle your data.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">5. Sharing Your Data</h2>
                    <p className="mb-4">Your personal data will not be shared with third parties without your explicit consent, except in the following circumstances:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li><strong>Service Partners:</strong> We may share your email address with relevant security service providers when you submit a client request form, so they can contact you about your inquiry</li>
                      <li><strong>Password Reset:</strong> When you request a password reset, your IP address is temporarily used for security verification purposes</li>
                      <li><strong>Legal Requirements:</strong> We may disclose your information if required by law, regulation, or legal process</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">6. Data Storage Duration</h2>
                    <p className="mb-4">We retain your personal data for the following periods:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li><strong>Form Submissions:</strong> Retained indefinitely unless you request deletion, for the purpose of ongoing communication and service provision</li>
                      <li><strong>User Profile Data:</strong> Retained indefinitely while your account is active, or for 90 days after account deletion unless required to retain for legal purposes</li>
                      <li><strong>Login Logs:</strong> Retained for 30 days for security purposes</li>
                      <li><strong>Analytics Data:</strong> Retained for 24 months to help us understand long-term trends</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">7. Your Data Protection Rights</h2>
                    <p className="mb-4">Under applicable data protection laws (including the EU General Data Protection Regulation), you have the following rights regarding your personal data:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li><strong>Right of Access:</strong> You can request a copy of the personal data we hold about you</li>
                      <li><strong>Right to Rectification:</strong> You can request correction of inaccurate or incomplete data</li>
                      <li><strong>Right to Erasure:</strong> You can request deletion of your personal data (subject to certain legal exceptions)</li>
                      <li><strong>Right to Restrict Processing:</strong> You can request that we limit how we use your data</li>
                      <li><strong>Right to Data Portability:</strong> You can request your data in a portable format</li>
                      <li><strong>Right to Object:</strong> You can object to certain types of data processing</li>
                    </ul>
                    <p className="mt-4">To exercise any of these rights, please contact us using the contact details provided below.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">8. Data Transfer and Automated Processing</h2>
                    <p className="mb-4">To prevent spam and abuse, we use automated systems to analyze form submissions and user behavior. This may include:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li>Pattern detection to identify potentially fraudulent or spam submissions</li>
                      <li>Behavioral analysis to detect unusual account activity</li>
                      <li>Automated email verification</li>
                    </ul>
                    <p className="mt-4">If your submission is flagged as potentially spam or suspicious, it may be reviewed by our team before processing.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">9. Security</h2>
                    <p className="mb-4">We employ industry-standard security measures to protect your personal data:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li><strong>SSL/TLS Encryption:</strong> All data transmitted between your browser and our servers is encrypted using Secure Sockets Layer (SSL) or Transport Layer Security (TLS) technology</li>
                      <li><strong>Secure Passwords:</strong> Passwords are hashed and salted before storage</li>
                      <li><strong>Access Controls:</strong> Access to personal data is restricted to authorized personnel only</li>
                      <li><strong>Regular Security Audits:</strong> We periodically review our security measures</li>
                    </ul>
                    <p className="mt-4">While we implement comprehensive security measures, no method of transmission over the internet is 100% secure. You use our services at your own risk, and we cannot guarantee absolute security.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">10. Changes to This Privacy Policy</h2>
                    <p className="mb-4">We reserve the right to update this privacy policy at any time to reflect changes in our data handling practices, legal requirements, or other factors. We will notify you of material changes by updating the date at the bottom of this policy and, in some cases, by sending you an email notification.</p>
                    <p>Your continued use of our website following any changes to this policy constitutes your acceptance of those changes. We recommend reviewing this policy regularly to stay informed about how we protect your data.</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-3">Contact Us</h2>
                    <p className="mb-4">If you have any questions, concerns, or requests regarding this privacy policy or our handling of your personal data, please contact us at:</p>
                    <p className="mb-4"><strong>Email:</strong> <a href="mailto:info@businessconnected24.de" className="text-blue-600 hover:text-blue-700 underline transition-colors duration-200">info@businessconnected24.de</a></p>
                    <p>We are committed to responding to all data protection inquiries within 30 days and to working with you to resolve any concerns regarding the processing of your personal data.</p>
                  </div>
                </div>
              </>
            )}

            {/* Back to Home */}
            <div className="mt-12 pt-8 border-t" style={{ borderColor: 'var(--theme-border)' }}>
              <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 underline transition-colors duration-200">
                ← {isGerman ? 'Zurück zur Startseite' : 'Back to Home'}
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
}
