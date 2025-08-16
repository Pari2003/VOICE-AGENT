from murf import Murf

client = Murf(api_key="ap2_0f754b94-2f6b-4dba-8498-ef39bb26b35e")

response = client.text_to_speech.generate(
    text="In this experiential e-learning module, you’ll master the basics of using this Text to Speech widget.",
    voice_id="en-US-natalie"
)

print("Audio File URL:", response.audio_file)
