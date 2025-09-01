Step 3: Fill in the ONE Placeholder (Taste and Adjust)
This is the only piece of code you need to think about. In the WorkspacePlugin.java file, find this method:
code
Java
private String determineModifiedBy(WorkspaceEvent event) {
    // TODO: This is a critical placeholder. You need to investigate the `WorkspaceEvent`
    // or other Structurizr context to find the actual user's identity.
    // For now, we return a placeholder.
    return "user.from.plugin.context";
}
Action for Now (Thin Slice): To get things working for your first test, it is perfectly okay to just change the return value to a simple string.
code
Java
// Change it to this for your first test:
return "Test User";
Action for Later (Real Version): You will need to come back here and figure out how to get the real username. You can do this by inspecting the event object that is passed into the method. Does it have a method like event.getUsername() or event.getUser()? This requires a little bit of investigation into the Structururizr library itself. But for now, a placeholder is fine.
✅ Step 4: Configure the Environment (Turn on the Oven)
The Java code needs two secret pieces of information that should NOT be written in the code itself: the API address and the HMAC secret key.
Action: You need to set these as Environment Variables in the place where your Structurizr plugin runs.
PORTAL_API_URL: The full address of the Next.js API endpoint we are about to build.
Example Value: http://localhost:3000/api/events/workspace-modified
PORTAL_API_SECRET: A long, random, secret string. You make this up. It must be exactly the same in Java and in your Next.js app.
Example Value: ThisIsMySuperSecretKeyForHmacAndItShouldBeVeryLongAndRandom123!
How to set them in IntelliJ for testing:
Go to Run -> Edit Configurations...
Find the run configuration for your plugin/application.
In the "Environment variables" field, add the two variables above.
Summary of Your Task
So, to answer your question: Yes, the code was detailed enough. Your job is to:
Create the files in the right folders and paste the code.
Update your build.gradle file with the dependencies.
Change the one placeholder in determineModifiedBy() to a test value like "Test User".
Set the two environment variables so your plugin knows where to send data and what the secret key is.
Build and run your plugin.





Hi Gregory,
Hope you’re doing well.

I’m working on extending the Structurizr plugin so it can emit workspace modification events to the Structurizr portal. I’d like to confirm what authentication mechanisms are supported or recommended for sending data from the plugin to the portal.

Specifically, should this integration rely on Kerberos tickets, mTLS, or JWT issued via MSAD SSO (or another mechanism you’ve already set up)?


Thanks, Gregory! That’s very helpful.
Could you point me to any documentation or code examples on how a Java application can obtain an OIDC token from Webstax? That would really help me integrate the plugin with the portal using the correct approach.

"Thanks, Gregory! That's very helpful. Could you point me to the documentation or a code example for how a Java application can get an OIDC token from Webstax?