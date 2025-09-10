const { ethers } = require('ethers');
const { 
  verifyGST, 
  verifyERP, 
  verifyLogistics, 
  blockchainService 
} = require('../services/oracle');
const {
  createInvoice,
  updateInvoiceVerification,
  getInvoice,
  getVerifiedInvoices,
  createEvent
} = require('../db/database');

// Verify and mint invoice
const verifyAndMint = async (req, res) => {
  try {
    // Handle file if uploaded
    const uploadedFile = req.file;
    let fileMetadata = null;
    
    if (uploadedFile) {
      fileMetadata = {
        filename: uploadedFile.filename,
        originalName: uploadedFile.originalname,
        path: uploadedFile.path,
        size: uploadedFile.size,
        mimetype: uploadedFile.mimetype
      };
      console.log('File uploaded:', fileMetadata);
    }
    
    const {
      supplier,
      buyer,
      invoiceNumber,
      amount,
      dueDate,
      metadataIPFS,
      gstin,
      issueDate
    } = req.body;

    // Validate input
    if (!supplier || !buyer || !invoiceNumber || !amount || !dueDate) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    console.log('Starting verification for invoice:', invoiceNumber);

    // Step 1: Mock verification (in production, these would be real API calls)
    const gstResult = await verifyGST(gstin, invoiceNumber);
    const erpResult = await verifyERP(buyer, invoiceNumber, amount);
    const logisticsResult = await verifyLogistics(invoiceNumber);

    if (!gstResult.verified || !erpResult.verified || !logisticsResult.verified) {
      return res.status(400).json({
        error: 'Verification failed',
        details: {
          gst: gstResult,
          erp: erpResult,
          logistics: logisticsResult
        }
      });
    }

    // Step 2: Calculate invoice hash
    const invoiceObj = {
      supplier,
      buyer,
      invoiceNumber,
      amount,
      dueDate,
      issueDate: issueDate || new Date().toISOString()
    };
    
    const invoiceHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(invoiceObj))
    );

    // Step 3: Mint NFT
    console.log('Minting NFT for invoice...');
    const mintResult = await blockchainService.mintInvoice(
      supplier,
      buyer,
      invoiceHash,
      metadataIPFS || `ipfs://mock/${invoiceNumber}`
    );

    if (!mintResult.success) {
      throw new Error('Failed to mint invoice NFT');
    }

    const tokenId = mintResult.tokenId;
    console.log('NFT minted with tokenId:', tokenId);

    // Step 4: Register invoice for funding
    const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
    console.log('Registering invoice for funding...');
    
    const registerResult = await blockchainService.registerInvoice(
      tokenId,
      amount,
      buyer,
      dueDateTimestamp
    );

    if (!registerResult.success) {
      throw new Error('Failed to register invoice for funding');
    }

    // Step 5: Save to database
    await createInvoice({
      token_id: tokenId,
      invoice_hash: invoiceHash,
      supplier,
      buyer,
      invoice_number: invoiceNumber,
      issue_date: issueDate || new Date().toISOString(),
      due_date: dueDate,
      face_value: amount,
      token_uri: metadataIPFS || `ipfs://mock/${invoiceNumber}`,
      file_metadata: fileMetadata ? JSON.stringify(fileMetadata) : null
    });

    // Update verification status
    await updateInvoiceVerification(tokenId, 'gst');
    await updateInvoiceVerification(tokenId, 'erp');
    await updateInvoiceVerification(tokenId, 'logistics');

    // Log event
    await createEvent({
      token_id: tokenId,
      event_type: 'INVOICE_MINTED',
      payload: {
        supplier,
        buyer,
        invoiceNumber,
        amount,
        tokenId,
        invoiceHash
      },
      tx_hash: mintResult.txHash
    });

    await createEvent({
      token_id: tokenId,
      event_type: 'INVOICE_REGISTERED',
      payload: {
        tokenId,
        amount,
        buyer,
        dueDate: dueDateTimestamp
      },
      tx_hash: registerResult.txHash
    });

    return res.json({
      success: true,
      tokenId,
      invoiceHash,
      mintTxHash: mintResult.txHash,
      registerTxHash: registerResult.txHash,
      message: 'Invoice verified, minted, and registered successfully'
    });

  } catch (error) {
    console.error('Error in verifyAndMint:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};

// Get verified invoices
const getVerifiedInvoicesEndpoint = async (req, res) => {
  try {
    const invoices = await getVerifiedInvoices();
    
    // Enrich with blockchain status
    const enrichedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        try {
          const status = await blockchainService.getInvoiceStatus(invoice.token_id);
          return {
            ...invoice,
            blockchainStatus: status
          };
        } catch (error) {
          console.error(`Failed to get status for token ${invoice.token_id}:`, error);
          return invoice;
        }
      })
    );

    return res.json({
      success: true,
      invoices: enrichedInvoices
    });
  } catch (error) {
    console.error('Error getting verified invoices:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};

// Get invoice details
const getInvoiceDetails = async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    // Get from database
    const dbInvoice = await getInvoice(tokenId);
    if (!dbInvoice) {
      return res.status(404).json({
        error: 'Invoice not found'
      });
    }

    // Get from blockchain
    const blockchainDetails = await blockchainService.getInvoiceDetails(tokenId);
    const blockchainStatus = await blockchainService.getInvoiceStatus(tokenId);

    return res.json({
      success: true,
      invoice: {
        ...dbInvoice,
        blockchain: {
          details: blockchainDetails,
          status: blockchainStatus
        }
      }
    });
  } catch (error) {
    console.error('Error getting invoice details:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};

module.exports = {
  verifyAndMint,
  getVerifiedInvoices: getVerifiedInvoicesEndpoint,
  getInvoiceDetails
};
